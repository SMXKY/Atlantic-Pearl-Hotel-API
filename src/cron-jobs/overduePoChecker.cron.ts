import cron from "node-cron";
import { InventoryPurchaseOrderModel } from "../models/Inventory/Inventorypurchaseorder.model";
import {
  sendNotification,
  getIdsFromPermissions,
} from "../util/sendNotification.util";
import { allPermissions } from "../types/Permissions.type";
import { NotificationType } from "../models/Notifications/Notification.model";

// ─── overduePoCheckerJob ──────────────────────────────────────────────────────
// Runs every day at 07:00.
// Finds all POs in sent or partial status where expectedDeliveryDate
// has passed and isOverdue is not yet true, sets isOverdue to true,
// and notifies the hotel manager and store managers.

export const overduePoCheckerJob = () => {
  cron.schedule("0 7 * * *", async () => {
    console.log("🔄 Running overdue PO checker job...");

    try {
      const now = new Date();

      // Find POs that are past their delivery date but not yet flagged
      const overduePOs = await InventoryPurchaseOrderModel.find({
        status: { $in: ["sent", "partial"] },
        expectedDeliveryDate: { $lt: now },
        isOverdue: false,
      })
        .populate("supplier", "name code")
        .populate("location", "name code")
        .populate("createdBy", "name email");

      if (overduePOs.length === 0) {
        console.log("✅ No overdue POs found.");
        return;
      }

      console.log(`⚠️  Found ${overduePOs.length} overdue PO(s).`);

      // Get users with PO approval permission (hotel managers)
      const managerIds = await getIdsFromPermissions(
        allPermissions.inventoryPurchaseOrders.approve
      );

      for (const po of overduePOs) {
        const supplierName = (po.supplier as any)?.name ?? "Unknown Supplier";
        const locationName = (po.location as any)?.name ?? "Unknown Location";
        const daysOverdue = Math.floor(
          (now.getTime() - po.expectedDeliveryDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        const title = `📦 Overdue Purchase Order: ${po.poNumber}`;
        const message = `Purchase order ${
          po.poNumber
        } from ${supplierName} for ${locationName} is ${daysOverdue} day(s) overdue. Expected delivery was ${po.expectedDeliveryDate.toLocaleDateString(
          "en-GB"
        )}. Follow up with the supplier immediately.`;

        // Mark PO as overdue
        po.isOverdue = true;
        await po.save();

        // Notify hotel managers
        if (managerIds.length > 0) {
          await sendNotification({
            userIds: managerIds,
            title,
            message,
            type: NotificationType.INVENTORY_CRITICAL,
            entityRef: {
              model: "InventoryPurchaseOrder",
              id: String(po._id),
            },
            redirectUrl: `/inventory/purchase-orders/${po._id}`,
          });
        }

        // Also notify the person who created the PO if not already in managers list
        const creatorId = (po.createdBy as any)?._id?.toString();
        if (creatorId && !managerIds.includes(creatorId)) {
          await sendNotification({
            userIds: [creatorId],
            title,
            message,
            type: NotificationType.ALERT,
            entityRef: {
              model: "InventoryPurchaseOrder",
              id: String(po._id),
            },
            redirectUrl: `/inventory/purchase-orders/${po._id}`,
          });
        }

        console.log(
          `✅ PO ${po.poNumber} flagged as overdue and team notified.`
        );
      }
    } catch (err) {
      console.error("❌ overduePoCheckerJob error:", err);
    }
  });
};
