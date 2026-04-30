/*
The Permission tree can only be a single step deep e.g

  {
    users: {
      readOne: "can_read_user",
      readAll: "can_read_all_users",
      delete: "can_delete_user",
    },
  };

  So users.readOne, is as far as you can go
*/

/* ---------
   MODULES (constants)
   --------- */
export const MODULES = {
  USER_MANAGEMENT: "User Management",
  HUMAN_RESOURCES: "Human Resources",
  PERMISSIONS: "Permissions",
  AUDIT: "Audit",
  RESERVATIONS: "Reservations",
  PROPERTY: "Property Management",
  PRICING: "Pricing",
  ADMINISTRATION: "Administration",
  BILLING: "Billing",
  PARKING: "Parking",
  RESTAURANT: "Restaurant",
  CONTENT: "Content",
  // In MODULES
  INVENTORY_MANAGEMENT: "Inventory Management",
} as const;

/* ---------
     SUBMODULES (constants)
     --------- */
export const SUBMODULES = {
  USERS: "Users",
  AUTH: "Auth",
  DEPARTMENTS: "Departments",
  DASHBOARDS: "Dashboards",
  EMPLOYEES: "Employees",
  GUESTS: "Guests",
  PERMISSIONS: "Permissions",
  PERMISSION_OVERRIDES: "Permission Overrides",
  ROLE_OVERRIDES: "Role Overrides",
  POSITIONS: "Positions",
  ROLES: "Roles",
  ROLE_PERMISSIONS: "Role Permissions",
  ACTIVITY_LOGS: "Activity Logs",
  GUEST_RESERVATIONS: "Guest Reservations",
  BUILDINGS: "Buildings",
  ROOMS: "Rooms",
  ROOM_TYPES: "Room Types",
  RATES: "Rates",
  DISCOUNTS: "Discounts",
  TAXES: "Taxes",
  ADMIN_CONFIGURATION: "Admin Configuration",
  AMENITIES: "Amenities",
  ROOM_TYPE_AMENITIES: "Room Type Amenities",
  BED_TYPES: "Bed Types",
  ROOM_TYPE_BED_TYPES: "Room Type Bed Types",
  ROOM_TYPE_REVIEWS: "Room Type Reviews",
  INVOICES: "Invoices",
  ADMIN_DASHBOARD: "Admin Dashboard",
  PARKING_SECTION_TYPES: "Section Types",
  PARKING_SECTIONS: "Sections",
  PARKING_SPOTS: "Spots",
  PARKING_RESERVATIONS: "Reservations",
  BILLS: "Bills",
  BILL_ITEMS: "Bill Items",
  RESTAURANT_ITEM_CATEGORIES: "Item Categories",
  RESTAURANT_ITEMS: "Items",
  RESTAURANT_CARTS: "Carts",
  RESTAURANT_CART_ITEMS: "Cart Items",
  RESTAURANT_ORDERS: "Orders",
  MEAL_COMBOS: "Meal Combos",
  RESTAURANT_CONFIG: "Rules",
  MEALE_REDEMPTION: "Meal Redemptions",
  STATIONS: "Stations",
  // In SUBMODULES
  INVENTORY_LOCATIONS: "Locations",
  INVENTORY_CATEGORIES: "Categories",
  INVENTORY_ITEMS: "Items",
  INVENTORY_SUPPLIERS: "Suppliers",
  INVENTORY_REQUISITIONS: "Requisitions",
  INVENTORY_PURCHASE_ORDERS: "Purchase Orders",
  INVENTORY_STOCK_MOVEMENTS: "Stock Movements",
  INVENTORY_STOCK_TAKES: "Stock Takes",
  INVENTORY_FINANCIALS: "Financials",
  INVENTORY_REPORTS: "Reports",
  INVENTORY_SETTINGS: "Settings",
} as const;

// export const allPermissions = {
//   users: {
//     readOne: "can_read_user",
//     readAll: "can_read_all_users",
//     delete: "can_delete_user",
//     update: "can_update_user",
//     create: "can_create_user",
//     updatePassword: "can_update_password",
//   },
//   auth: {
//     activateAccount: "can_activate_account",
//     deActivateAccount: "can_de_activate_account",
//   },
//   departments: {
//     readOne: "can_read_department",
//     readAll: "can_read_all_departments",
//     delete: "can_delete_department",
//     update: "can_update_department",
//     create: "can_create_department",
//   },
//   employees: {
//     readOne: "can_read_employee",
//     readAll: "can_read_all_employees",
//     delete: "can_delete_employee",
//     update: "can_update_employee",
//     create: "can_create_employee",
//   },
//   guest: {
//     readOne: "can_read_guest",
//     readAll: "can_read_all_guests",
//     delete: "can_delete_guest",
//     update: "can_update_guest",
//     create: "can_create_guest",
//   },
//   permissions: {
//     readOne: "can_read_permission",
//     readAll: "can_read_all_permissions",
//     delete: "can_delete_permission",
//     update: "can_update_permission",
//     create: "can_create_permission",
//   },
//   permissionOverides: {
//     readOne: "can_read_permission_overide",
//     readAll: "can_read_all_permission_overides",
//     delete: "can_delete_permission_overide",
//     update: "can_update_permission_overide",
//     create: "can_create_permission_overide",
//   },
//   roleOverides: {
//     readOne: "can_read_role_overide",
//     readAll: "can_read_all_role_overides",
//     delete: "can_delete_role_overide",
//     update: "can_update_role_overide",
//     create: "can_create_role_overide",
//   },
//   position: {
//     readOne: "can_read_position",
//     readAll: "can_read_all_positions",
//     delete: "can_delete_position",
//     update: "can_update_position",
//     create: "can_create_position",
//   },
//   roles: {
//     readOne: "can_read_role",
//     readAll: "can_read_all_roles",
//     delete: "can_delete_role",
//     update: "can_update_role",
//     create: "can_create_role",
//   },
//   rolePermissions: {
//     readOne: "can_read_role_permission",
//     readAll: "can_read_all_role_permissions",
//     delete: "can_delete_role_permission",
//     update: "can_update_role_permission",
//     create: "can_create_role_permission",
//   },
//   activityLogs: {
//     read: "can_read_activity_logs",
//   },
//   reservations: {
//     readOne: "can_read_reservation",
//     readAll: "can_read_all_reservations",
//     delete: "can_delete_reservation",
//     update: "can_update_reservation",
//     create: "can_create_reservation",
//     createManualReservation: "can_create_manual_reservation",
//     updateManualReservationPay: "can_update_manual_reservation_pay",
//     cancel: "can_cancel_reservation",
//     updateRooms: "can_update_reservation_rooms",
//     calendar: "can_read_calendar",
//   },
//   buildings: {
//     readOne: "can_read_building",
//     readAll: "can_read_all_buildings",
//     delete: "can_delete_building",
//     update: "can_update_building",
//     create: "can_create_building",
//   },
//   rooms: {
//     readOne: "can_read_room",
//     readAll: "can_read_all_rooms",
//     delete: "can_delete_room",
//     update: "can_update_room",
//     create: "can_create_room",
//   },
//   roomTypes: {
//     readOne: "can_read_room_type",
//     readAll: "can_read_all_room_types",
//     delete: "can_delete_room_type",
//     update: "can_update_room_type",
//     create: "can_create_room_type",
//   },
//   rates: {
//     readOne: "can_read_rate",
//     readAll: "can_read_all_rates",
//     delete: "can_delete_rate",
//     update: "can_update_rate",
//     create: "can_create_rate",
//   },
//   discounts: {
//     readOne: "can_read_discount",
//     readAll: "can_read_all_discounts",
//     delete: "can_delete_discount",
//     update: "can_update_discount",
//     create: "can_create_discount",
//   },
//   taxes: {
//     readOne: "can_read_tax",
//     readAll: "can_read_all_taxes",
//     delete: "can_delete_tax",
//     update: "can_update_tax",
//     create: "can_create_tax",
//   },
//   adminConfigurations: {
//     update: "can_update_admin_configuration",
//     read: "can_read_admin_configuration",
//   },
//   amenities: {
//     readOne: "can_read_amenity",
//     readAll: "can_read_all_amenities",
//     delete: "can_delete_amenity",
//     update: "can_update_amenity",
//     create: "can_create_amenity",
//   },
//   roomTypeAmenities: {
//     readOne: "can_read_room_type_amenity",
//     readAll: "can_read_all_room_type_amenities",
//     delete: "can_delete_room_type_amenity",
//     update: "can_update_room_type_amenity",
//     create: "can_create_room_type_amenity",
//   },
//   bedTypes: {
//     readOne: "can_read_bed_type",
//     readAll: "can_read_all_bedTypes",
//     delete: "can_delete_bed_type",
//     update: "can_update_bed_type",
//     create: "can_create_bed_type",
//   },
//   roomTypeBedTypes: {
//     readOne: "can_read_room_type_bed_type",
//     readAll: "can_read_all_room_type_bed_types",
//     delete: "can_delete_room_type_bed_type",
//     update: "can_update_room_type_bed_type",
//     create: "can_create_room_type_bed_type",
//   },
//   roomTypeReviews: {
//     readOne: "can_read_room_type_review",
//     readAll: "can_read_all_room_type_reviews",
//     delete: "can_delete_room_type_review",
//     update: "can_update_room_type_review",
//     create: "can_create_room_type_review",
//   },
//   invoices: {
//     readOne: "can_read_invoice",
//     readAll: "can_read_all_invoices",
//     delete: "can_delete_invoice",
//     update: "can_update_invoice",
//     create: "can_create_invoice",
//   },
//   content: {
//     adminDashboard: "can_read_admin_dashboard",
//   },
//   parkingSectionTypes: {
//     readOne: "can_read_parking_section_type",
//     readAll: "can_read_all_parking_section_types",
//     delete: "can_delete_parking_section_type",
//     update: "can_update_parking_section_type",
//     create: "can_create_parking_section_type",
//   },
//   parkingSections: {
//     readOne: "can_read_parking_section",
//     readAll: "can_read_all_parking_sections",
//     delete: "can_delete_parking_section",
//     update: "can_update_parking_section",
//     create: "can_create_parking_section",
//   },
//   parkingSpots: {
//     readOne: "can_read_parking_spot",
//     readAll: "can_read_all_parking_spots",
//     delete: "can_delete_parking_spot",
//     update: "can_update_parking_spot",
//     create: "can_create_parking_spot",
//   },
//   parkingReservations: {
//     readOne: "can_read_parking_reservation",
//     readAll: "can_read_all_parking_reservations",
//     delete: "can_delete_parking_reservation",
//     update: "can_update_parking_reservation",
//     create: "can_create_parking_reservation",
//   },
//   bills: {
//     readOne: "can_read_bill",
//     readAll: "can_read_all_bills",
//     delete: "can_delete_bill",
//     update: "can_update_bill",
//     create: "can_create_bill",
//   },
//   billItems: {
//     readOne: "can_read_bill_item",
//     readAll: "can_read_all_bill_items",
//     delete: "can_delete_bill_item",
//     update: "can_update_bill_item",
//     create: "can_create_bill_item",
//   },
//   restaurantItemCategorys: {
//     readOne: "can_read_restaurant_item_category_item",
//     readAll: "can_read_all_restaurant_item_category_items",
//     delete: "can_delete_restaurant_item_category_item",
//     update: "can_update_restaurant_item_category_item",
//     create: "can_create_restaurant_item_category_item",
//   },
//   restaurantItems: {
//     readOne: "can_read_restaurant_item",
//     readAll: "can_read_all_restaurant_item",
//     delete: "can_delete_restaurant_item",
//     update: "can_update_restaurant_item",
//     create: "can_create_restaurant_item",
//   },
//   restaurantCarts: {
//     readOne: "can_read_restaurant_cart",
//     readAll: "can_read_all_restaurant_carts",
//     delete: "can_delete_restaurant_cart",
//     update: "can_update_restaurant_cart",
//     create: "can_create_restaurant_cart",
//   },
//   restaurantCartItems: {
//     readOne: "can_read_restaurant_cart_item",
//     readAll: "can_read_all_restaurant_cart_items",
//     delete: "can_delete_restaurant_cart_item",
//     update: "can_update_restaurant_cart_item",
//     create: "can_create_restaurant_cart_item",
//   },
//   restaurantOrders: {
//     readOne: "can_read_restaurant_restaurant_order",
//     readAll: "can_read_all_restaurant_restaurant_orders",
//     delete: "can_delete_restaurant_restaurant_order",
//     update: "can_update_restaurant_restaurant_order",
//     create: "can_create_restaurant_restaurant_order",
//   },
// };

// src/lib/permissions.ts
export const allPermissions = {
  users: {
    module: "User Management",
    submodule: "Users",
    readOne: "can_read_user",
    readAll: "can_read_all_users",
    delete: "can_delete_user",
    update: "can_update_user",
    create: "can_create_user",
    updatePassword: "can_update_password",
  },

  auth: {
    module: "User Management",
    submodule: "Auth",
    activateAccount: "can_activate_account",
    deActivateAccount: "can_de_activate_account",
  },

  departments: {
    module: "User Management",
    submodule: "Departments",
    readOne: "can_read_department",
    readAll: "can_read_all_departments",
    delete: "can_delete_department",
    update: "can_update_department",
    create: "can_create_department",
  },

  employees: {
    module: "Human Resources",
    submodule: "Employees",

    readOne: "can_read_employee",
    readAll: "can_read_all_employees",
    delete: "can_delete_employee",
    update: "can_update_employee",
    create: "can_create_employee",
  },

  guest: {
    module: "User Management",
    submodule: "Guests",

    readOne: "can_read_guest",
    readAll: "can_read_all_guests",
    delete: "can_delete_guest",
    update: "can_update_guest",
    create: "can_create_guest",
  },

  permissions: {
    module: "Permissions",
    submodule: "Permissions",

    readOne: "can_read_permission",
    readAll: "can_read_all_permissions",
    delete: "can_delete_permission",
    update: "can_update_permission",
    create: "can_create_permission",
  },

  permissionOverides: {
    module: "Permissions",
    submodule: "Permission Overrides",

    readOne: "can_read_permission_overide",
    readAll: "can_read_all_permission_overides",
    delete: "can_delete_permission_overide",
    update: "can_update_permission_overide",
    create: "can_create_permission_overide",
  },

  roleOverides: {
    module: "Permissions",
    submodule: "Role Overrides",

    readOne: "can_read_role_overide",
    readAll: "can_read_all_role_overides",
    delete: "can_delete_role_overide",
    update: "can_update_role_overide",
    create: "can_create_role_overide",
  },

  position: {
    module: "Human Resources",
    submodule: "Positions",

    readOne: "can_read_position",
    readAll: "can_read_all_positions",
    delete: "can_delete_position",
    update: "can_update_position",
    create: "can_create_position",
  },

  roles: {
    module: "User Management",
    submodule: "Roles",

    readOne: "can_read_role",
    readAll: "can_read_all_roles",
    delete: "can_delete_role",
    update: "can_update_role",
    create: "can_create_role",
  },

  rolePermissions: {
    module: "User Management",
    submodule: "Role Permissions",

    readOne: "can_read_role_permission",
    readAll: "can_read_all_role_permissions",
    delete: "can_delete_role_permission",
    update: "can_update_role_permission",
    create: "can_create_role_permission",
  },

  activityLogs: {
    module: "Audit",
    submodule: "Activity Logs",

    read: "can_read_activity_logs",
  },

  reservations: {
    module: "Reservations",
    submodule: "Guest Reservations",

    readOne: "can_read_reservation",
    readAll: "can_read_all_reservations",
    delete: "can_delete_reservation",
    update: "can_update_reservation",
    create: "can_create_reservation",
    createManualReservation: "can_create_manual_reservation",
    updateManualReservationPay: "can_update_manual_reservation_pay",
    cancel: "can_cancel_reservation",
    updateRooms: "can_update_reservation_rooms",
    calendar: "can_read_calendar",
  },

  buildings: {
    module: "Property Management",
    submodule: "Buildings",

    readOne: "can_read_building",
    readAll: "can_read_all_buildings",
    delete: "can_delete_building",
    update: "can_update_building",
    create: "can_create_building",
  },

  rooms: {
    module: "Property Management",
    submodule: "Rooms",

    readOne: "can_read_room",
    readAll: "can_read_all_rooms",
    delete: "can_delete_room",
    update: "can_update_room",
    create: "can_create_room",
  },

  stations: {
    module: "Property Management",
    submodule: "Stations",

    readOne: "can_read_station",
    readAll: "can_read_all_stations",
    delete: "can_delete_station",
    update: "can_update_station",
    create: "can_create_station",
  },

  roomTypes: {
    module: "Property Management",
    submodule: "Room Types",

    readOne: "can_read_room_type",
    readAll: "can_read_all_room_types",
    delete: "can_delete_room_type",
    update: "can_update_room_type",
    create: "can_create_room_type",
  },

  rates: {
    module: "Pricing",
    submodule: "Rates",

    readOne: "can_read_rate",
    readAll: "can_read_all_rates",
    delete: "can_delete_rate",
    update: "can_update_rate",
    create: "can_create_rate",
  },

  discounts: {
    module: "Pricing",
    submodule: "Discounts",

    readOne: "can_read_discount",
    readAll: "can_read_all_discounts",
    delete: "can_delete_discount",
    update: "can_update_discount",
    create: "can_create_discount",
  },

  taxes: {
    module: "Pricing",
    submodule: "Taxes",

    readOne: "can_read_tax",
    readAll: "can_read_all_taxes",
    delete: "can_delete_tax",
    update: "can_update_tax",
    create: "can_create_tax",
  },

  adminConfigurations: {
    module: "Administration",
    submodule: "Admin Configuration",

    update: "can_update_admin_configuration",
    read: "can_read_admin_configuration",
  },

  amenities: {
    module: "Property Management",
    submodule: "Amenities",

    readOne: "can_read_amenity",
    readAll: "can_read_all_amenities",
    delete: "can_delete_amenity",
    update: "can_update_amenity",
    create: "can_create_amenity",
  },

  roomTypeAmenities: {
    module: "Property Management",
    submodule: "Room Type Amenities",

    readOne: "can_read_room_type_amenity",
    readAll: "can_read_all_room_type_amenities",
    delete: "can_delete_room_type_amenity",
    update: "can_update_room_type_amenity",
    create: "can_create_room_type_amenity",
  },

  bedTypes: {
    module: "Property Management",
    submodule: "Bed Types",

    readOne: "can_read_bed_type",
    readAll: "can_read_all_bedTypes",
    delete: "can_delete_bed_type",
    update: "can_update_bed_type",
    create: "can_create_bed_type",
  },

  roomTypeBedTypes: {
    module: "Property Management",
    submodule: "Room Type Bed Types",

    readOne: "can_read_room_type_bed_type",
    readAll: "can_read_all_room_type_bed_types",
    delete: "can_delete_room_type_bed_type",
    update: "can_update_room_type_bed_type",
    create: "can_create_room_type_bed_type",
  },

  roomTypeReviews: {
    module: "Property Management",
    submodule: "Room Type Reviews",

    readOne: "can_read_room_type_review",
    readAll: "can_read_all_room_type_reviews",
    delete: "can_delete_room_type_review",
    update: "can_update_room_type_review",
    create: "can_create_room_type_review",
  },

  invoices: {
    module: "Billing",
    submodule: "Invoices",

    readOne: "can_read_invoice",
    readAll: "can_read_all_invoices",
    delete: "can_delete_invoice",
    update: "can_update_invoice",
    create: "can_create_invoice",
  },

  content: {
    module: "Content",
    submodule: "Admin Dashboard",

    adminDashboard: "can_read_admin_dashboard",
  },

  parkingSectionTypes: {
    module: "Parking",
    submodule: "Section Types",

    readOne: "can_read_parking_section_type",
    readAll: "can_read_all_parking_section_types",
    delete: "can_delete_parking_section_type",
    update: "can_update_parking_section_type",
    create: "can_create_parking_section_type",
  },

  parkingSections: {
    module: "Parking",
    submodule: "Sections",

    readOne: "can_read_parking_section",
    readAll: "can_read_all_parking_sections",
    delete: "can_delete_parking_section",
    update: "can_update_parking_section",
    create: "can_create_parking_section",
  },

  parkingSpots: {
    module: "Parking",
    submodule: "Spots",

    readOne: "can_read_parking_spot",
    readAll: "can_read_all_parking_spots",
    delete: "can_delete_parking_spot",
    update: "can_update_parking_spot",
    create: "can_create_parking_spot",
  },

  parkingReservations: {
    module: "Parking",
    submodule: "Reservations",

    readOne: "can_read_parking_reservation",
    readAll: "can_read_all_parking_reservations",
    delete: "can_delete_parking_reservation",
    update: "can_update_parking_reservation",
    create: "can_create_parking_reservation",
  },

  bills: {
    module: "Billing",
    submodule: "Bills",

    readOne: "can_read_bill",
    readAll: "can_read_all_bills",
    delete: "can_delete_bill",
    update: "can_update_bill",
    create: "can_create_bill",
  },

  billItems: {
    module: "Billing",
    submodule: "Bill Items",

    readOne: "can_read_bill_item",
    readAll: "can_read_all_bill_items",
    delete: "can_delete_bill_item",
    update: "can_update_bill_item",
    create: "can_create_bill_item",
  },

  restaurantItemCategorys: {
    module: "Restaurant",
    submodule: "Item Categories",

    readOne: "can_read_restaurant_item_category_item",
    readAll: "can_read_all_restaurant_item_category_items",
    delete: "can_delete_restaurant_item_category_item",
    update: "can_update_restaurant_item_category_item",
    create: "can_create_restaurant_item_category_item",
  },

  mealCombos: {
    module: "Restaurant",
    submodule: "Meal Combos",
    readOne: "can_read_meal_combos_item",
    readAll: "can_read_all_meal_combos_items",
    delete: "can_delete_meal_combos_item",
    update: "can_update_meal_combos_item",
    create: "can_create_meal_combos_item",
  },

  restaurantItems: {
    module: "Restaurant",
    submodule: "Items",

    readOne: "can_read_restaurant_item",
    readAll: "can_read_all_restaurant_item",
    delete: "can_delete_restaurant_item",
    update: "can_update_restaurant_item",
    create: "can_create_restaurant_item",
  },

  restaurantCarts: {
    module: "Restaurant",
    submodule: "Carts",

    readOne: "can_read_restaurant_cart",
    readAll: "can_read_all_restaurant_carts",
    delete: "can_delete_restaurant_cart",
    update: "can_update_restaurant_cart",
    create: "can_create_restaurant_cart",
  },

  restaurantCartItems: {
    module: "Restaurant",
    submodule: "Cart Items",

    readOne: "can_read_restaurant_cart_item",
    readAll: "can_read_all_restaurant_cart_items",
    delete: "can_delete_restaurant_cart_item",
    update: "can_update_restaurant_cart_item",
    create: "can_create_restaurant_cart_item",
  },

  restaurantOrders: {
    module: "Restaurant",
    submodule: "Orders",

    readOne: "can_read_restaurant_restaurant_order",
    readAll: "can_read_all_restaurant_restaurant_orders",
    delete: "can_delete_restaurant_restaurant_order",
    update: "can_update_restaurant_restaurant_order",
    create: "can_create_restaurant_restaurant_order",
  },
  restaurantConfig: {
    module: "Restaurant",
    submodule: "Rules",
    readOne: "can_read_restaurant_config",
    update: "can_update_restaurant_config",
  },
  mealRedemptions: {
    module: "Restaurant",
    submodule: "Meal Redemptions",
    create: "can_create_meal_redemption",
    readOne: "can_read_meal_redemption",
    readAll: "can_read_all_meal_redemptions",
  },
  // =====================
  // INVENTORY MODULE
  // =====================

  inventoryLocations: {
    module: "Inventory Management",
    submodule: "Locations",
    create: "can_create_inventory_location",
    update: "can_update_inventory_location",
    delete: "can_delete_inventory_location",
    readOne: "can_read_inventory_location",
    readAll: "can_read_all_inventory_locations",
    assign: "can_assign_inventory_location",
  },

  inventoryCategories: {
    module: "Inventory Management",
    submodule: "Categories",
    create: "can_create_inventory_category",
    update: "can_update_inventory_category",
    delete: "can_delete_inventory_category",
    readOne: "can_read_inventory_category",
    readAll: "can_read_all_inventory_categories",
  },

  inventoryItems: {
    module: "Inventory Management",
    submodule: "Items",
    create: "can_create_inventory_item",
    update: "can_update_inventory_item",
    delete: "can_delete_inventory_item",
    readOne: "can_read_inventory_item",
    readAll: "can_read_all_inventory_items",
  },

  inventorySuppliers: {
    module: "Inventory Management",
    submodule: "Suppliers",
    create: "can_create_inventory_supplier",
    update: "can_update_inventory_supplier",
    delete: "can_delete_inventory_supplier",
    readOne: "can_read_inventory_supplier",
    readAll: "can_read_all_inventory_suppliers",
    rate: "can_rate_inventory_supplier",
  },

  inventoryRequisitions: {
    module: "Inventory Management",
    submodule: "Requisitions",
    create: "can_create_inventory_requisition",
    approve: "can_approve_inventory_requisition",
    readOne: "can_read_inventory_requisition",
    readAll: "can_read_all_inventory_requisitions",
  },

  inventoryPurchaseOrders: {
    module: "Inventory Management",
    submodule: "Purchase Orders",
    create: "can_create_inventory_po",
    approve: "can_approve_inventory_po",
    readOne: "can_read_inventory_po",
    readAll: "can_read_all_inventory_pos",
  },

  inventoryStockMovements: {
    module: "Inventory Management",
    submodule: "Stock Movements",
    receive: "can_receive_inventory_stock",
    issue: "can_issue_inventory_stock",
    transfer: "can_transfer_inventory_stock",
    logWastage: "can_log_inventory_wastage",
    overrideBlock: "can_override_inventory_stock_block",
  },

  inventoryStockTakes: {
    module: "Inventory Management",
    submodule: "Stock Takes",
    initiate: "can_initiate_inventory_stocktake",
    conduct: "can_conduct_inventory_stocktake",
    approve: "can_approve_inventory_stocktake",
    readOne: "can_read_inventory_stocktake",
    readAll: "can_read_all_inventory_stocktakes",
  },

  inventoryFinancials: {
    module: "Inventory Management",
    submodule: "Financials",
    read: "can_read_inventory_financials",
    setBudget: "can_set_inventory_budget",
    recordPayment: "can_record_inventory_payment",
  },

  inventoryReports: {
    module: "Inventory Management",
    submodule: "Reports",
    read: "can_read_inventory_reports",
    export: "can_export_inventory_reports",
  },

  inventorySettings: {
    module: "Inventory Management",
    submodule: "Settings",
    manageAlerts: "can_manage_inventory_alerts",
    manageRetention: "can_manage_inventory_retention",
    readGlobal: "can_read_global_inventory",
  },

  inventoryAlertConfigs: {
    module: "Inventory Management",
    submodule: "Alerts",
    manageAlerts: "can_manage_inventory_alerts",
    manageRetention: "can_manage_inventory_retention",
    readGlobal: "can_read_global_inventory",
  },

  dashboards: {
    module: "Content",
    submodule: "Dashboards",
    viewFrontDesk: "can_view_frontdesk_dashboard",
    viewParking: "can_view_parking_dashboard",
    viewRestaurant: "can_view_restaurant_dashboard",
    viewInventory: "can_view_inventory_dashboard",
    viewHR: "can_view_hr_dashboard",
    viewFinance: "can_view_finance_dashboard",
  },
} as const;
