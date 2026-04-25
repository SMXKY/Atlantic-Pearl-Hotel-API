import { InventoryAlertConfigModel } from "../models/Inventory/Inventoryalertconfig.model";
import { InventoryItemLocationModel } from "../models/Inventory/Inventoryitemlocation.model";
import {
  sendNotification,
  getIdsFromPermissions,
} from "./sendNotification.util";
import { sendEmail } from "./sendEmail.util";
import { allPermissions } from "../types/Permissions.type";
import { NotificationType } from "../models/Notifications/Notification.model";

export type AlertSeverity = "warning" | "critical";

export const fireInventoryAlert = async (
  itemId: string,
  locationId: string,
  newStockLevel: number,
  triggeredBy: string
): Promise<void> => {
  try {
    const alertConfig = await InventoryAlertConfigModel.findOne({
      item: itemId,
      location: locationId,
      isActive: true,
    })
      .populate("item", "name sku")
      .populate("location", "name code")
      .lean();

    if (!alertConfig) return;

    let severity: AlertSeverity | null = null;

    if (newStockLevel <= alertConfig.criticalThreshold) {
      severity = "critical";
    } else if (newStockLevel <= alertConfig.warningThreshold) {
      severity = "warning";
    }

    if (!severity) return;

    if (alertConfig.lastAlertSentAt) {
      const cooldownMs = alertConfig.cooldownMinutes * 60 * 1000;
      const timeSinceLast =
        new Date().getTime() - new Date(alertConfig.lastAlertSentAt).getTime();

      if (timeSinceLast < cooldownMs) return;
    }

    const itemName = (alertConfig.item as any)?.name ?? "Unknown Item";
    const itemSku = (alertConfig.item as any)?.sku ?? "N/A";
    const locationName =
      (alertConfig.location as any)?.name ?? "Unknown Location";
    const locationCode = (alertConfig.location as any)?.code ?? "";

    const title =
      severity === "critical"
        ? `🔴 Critical Stock Alert: ${itemName}`
        : `🟡 Low Stock Warning: ${itemName}`;

    const message =
      severity === "critical"
        ? `${itemName} (${itemSku}) at ${locationName} (${locationCode}) has dropped to ${newStockLevel} units — at or below the critical threshold of ${alertConfig.criticalThreshold}. Stock issues have been automatically blocked. Immediate action required.`
        : `${itemName} (${itemSku}) at ${locationName} (${locationCode}) has dropped to ${newStockLevel} units — at or below the warning threshold of ${alertConfig.warningThreshold}. Consider raising a purchase order or transfer.`;

    // Collect recipient user IDs from alert config
    const recipientUserIds = alertConfig.recipients.map((r: any) =>
      r.user.toString()
    );

    // Send in-app notification to all recipients
    if (recipientUserIds.length > 0) {
      await sendNotification({
        userIds: recipientUserIds,
        title,
        message,
        type:
          severity === "critical"
            ? NotificationType.INVENTORY_CRITICAL
            : NotificationType.INVENTORY_WARNING,
        entityRef: {
          model: "InventoryItemLocation",
          id: String(
            (
              await InventoryItemLocationModel.findOne({
                item: itemId,
                location: locationId,
              })
                .select("_id")
                .lean()
            )?._id
          ),
        },
        redirectUrl: `/inventory/items/${itemId}/stock`,
      });
    }

    // Send email to recipients who have email channel enabled
    const emailRecipients = alertConfig.recipients.filter((r: any) =>
      r.channels.includes("email")
    );

    for (const recipient of emailRecipients) {
      // We need the user's email -- fetch it
      const { UserModel } = await import("../models/HR/User.model");
      const user = await UserModel.findById(recipient.user)
        .select("email name")
        .lean();

      if (user?.email) {
        await sendEmail(
          user.email,
          title,
          message,
          `<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
            <div style="background: #1E3A8A; padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 18px;">Atlantic Pearl Hotel & Resort</h1>
              <p style="color: #F59E0B; margin: 4px 0 0; font-size: 12px; letter-spacing: 2px;">INVENTORY MANAGEMENT</p>
            </div>
            <div style="background: ${
              severity === "critical" ? "#FEF2F2" : "#FEF3C7"
            }; border-left: 4px solid ${
            severity === "critical" ? "#DC2626" : "#F59E0B"
          }; padding: 20px; margin: 0;">
              <h2 style="color: ${
                severity === "critical" ? "#DC2626" : "#D97706"
              }; margin: 0 0 12px;">${title}</h2>
              <p style="color: #334155; margin: 0; line-height: 1.6;">${message}</p>
            </div>
            <div style="background: #F8FAFC; padding: 20px; border-radius: 0 0 8px 8px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #94A3B8; font-size: 13px;">Item</td><td style="padding: 6px 0; color: #0F172A; font-weight: bold; font-size: 13px;">${itemName} (${itemSku})</td></tr>
                <tr><td style="padding: 6px 0; color: #94A3B8; font-size: 13px;">Location</td><td style="padding: 6px 0; color: #0F172A; font-size: 13px;">${locationName} (${locationCode})</td></tr>
                <tr><td style="padding: 6px 0; color: #94A3B8; font-size: 13px;">Current Stock</td><td style="padding: 6px 0; color: ${
                  severity === "critical" ? "#DC2626" : "#D97706"
                }; font-weight: bold; font-size: 13px;">${newStockLevel} units</td></tr>
                <tr><td style="padding: 6px 0; color: #94A3B8; font-size: 13px;">Threshold</td><td style="padding: 6px 0; color: #334155; font-size: 13px;">${
                  severity === "critical"
                    ? alertConfig.criticalThreshold
                    : alertConfig.warningThreshold
                } units (${severity})</td></tr>
              </table>
              <p style="margin: 16px 0 0; color: #94A3B8; font-size: 11px;">This is an automated alert from the Atlantic Pearl Inventory Management System.</p>
            </div>
          </div>`
        );
      }
    }

    // Auto-block item at this location if severity is critical
    if (severity === "critical") {
      await InventoryItemLocationModel.findOneAndUpdate(
        { item: itemId, location: locationId },
        {
          isBlocked: true,
          blockedReason: `Automatically blocked: stock dropped to ${newStockLevel} units, at or below critical threshold of ${alertConfig.criticalThreshold}`,
          blockedBy: triggeredBy,
          blockedAt: new Date(),
          updatedBy: triggeredBy,
        }
      );
    }

    // Update lastAlertSentAt to start the cooldown window
    await InventoryAlertConfigModel.findByIdAndUpdate(alertConfig._id, {
      lastAlertSentAt: new Date(),
    });
  } catch (err) {
    // Alerts are non-critical -- log the error but never throw
    // so a failed alert never breaks the main operation
    console.error("fireInventoryAlert error:", err);
  }
};

// ─── fireBudgetAlert ──────────────────────────────────────────────────────────
// Call this after confirmSupplierPayment to check if any category budget
// has crossed 80% spend or gone over 100%.

export const fireBudgetAlert = async (
  categoryId: string,
  month: number,
  year: number
): Promise<void> => {
  try {
    const { InventoryBudgetModel } = await import(
      "../models/Inventory/Inventorybudget.model"
    );
    const { InventoryCategoryModel } = await import(
      "../models/Inventory/Inventorycategory.model"
    );

    const budget = await InventoryBudgetModel.findOne({
      category: categoryId,
      month,
      year,
    }).lean();

    if (!budget || budget.budgetAmountInCFA === 0) return;

    const spendPct = (budget.actualSpendInCFA / budget.budgetAmountInCFA) * 100;

    let alertLevel: "warning" | "critical" | null = null;
    if (spendPct >= 100) alertLevel = "critical";
    else if (spendPct >= 80) alertLevel = "warning";

    if (!alertLevel) return;

    const category = await InventoryCategoryModel.findById(categoryId)
      .select("name")
      .lean();
    const categoryName = category?.name ?? "Unknown Category";

    const monthName = new Date(year, month - 1).toLocaleString("en-GB", {
      month: "long",
    });

    const title =
      alertLevel === "critical"
        ? `🔴 Budget Exceeded: ${categoryName}`
        : `🟡 Budget Warning: ${categoryName}`;

    const message =
      alertLevel === "critical"
        ? `The ${categoryName} inventory budget for ${monthName} ${year} has been exceeded. Spent: ${budget.actualSpendInCFA.toLocaleString()} CFA of ${budget.budgetAmountInCFA.toLocaleString()} CFA (${spendPct.toFixed(
            1
          )}%).`
        : `The ${categoryName} inventory budget for ${monthName} ${year} is at ${spendPct.toFixed(
            1
          )}%. Spent: ${budget.actualSpendInCFA.toLocaleString()} CFA of ${budget.budgetAmountInCFA.toLocaleString()} CFA.`;

    // Notify users with financial read permission
    const managerIds = await getIdsFromPermissions(
      allPermissions.inventoryFinancials.read
    );

    if (managerIds.length > 0) {
      await sendNotification({
        userIds: managerIds,
        title,
        message,
        type:
          alertLevel === "critical"
            ? NotificationType.INVENTORY_CRITICAL
            : NotificationType.INVENTORY_WARNING,
        redirectUrl: `/inventory/budgets`,
      });
    }
  } catch (err) {
    console.error("fireBudgetAlert error:", err);
  }
};
