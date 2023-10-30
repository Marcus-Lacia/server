import "reflect-metadata";
import { container } from "tsyringe";
import { vi, beforeAll, afterEach, describe, expect, it } from "vitest";

import { ItemHelper } from "@spt-aki/helpers/ItemHelper";
import { Item, Repairable } from "@spt-aki/models/eft/common/tables/IItem";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { HashUtil } from "@spt-aki/utils/HashUtil";

describe("ItemHelper", () =>
{
    let itemHelper: ItemHelper;

    beforeAll(() =>
    {
        itemHelper = container.resolve<ItemHelper>("ItemHelper");
    });

    afterEach(() =>
    {
        vi.restoreAllMocks();
    });

    describe("isValidItem", () =>
    {
        it("should return false when item details are not available", () =>
        {
            const result = itemHelper.isValidItem("non-existent-item");
            expect(result).toBe(false);
        });

        it("should return false when item is a quest item", () =>
        {
            const result = itemHelper.isValidItem("590de92486f77423d9312a33"); // "Gold pocket watch on a chain"
            expect(result).toBe(false);
        });

        it("should return false when item is of an invalid base type", () =>
        {
            const result = itemHelper.isValidItem("5fc64ea372b0dd78d51159dc", ["invalid-base-type"]); // "Cultist knife"
            expect(result).toBe(false);
        });

        it("should return false when item's price is zero", () =>
        {
            // Unsure if any item has price of "0", so mock the getItemPrice method to return 0.
            vi.spyOn(itemHelper, "getItemPrice").mockReturnValue(0);

            const result = itemHelper.isValidItem("5fc64ea372b0dd78d51159dc");
            expect(result).toBe(false);
        });

        it("should return false when item is in the blacklist", () =>
        {
            const result = itemHelper.isValidItem("6087e570b998180e9f76dc24"); // "Superfors DB 2020 Dead Blow Hammer"
            expect(result).toBe(false);
        });

        it("should return true when item is valid", () =>
        {
            const result = itemHelper.isValidItem("5fc64ea372b0dd78d51159dc"); // "Cultist knife"
            expect(result).toBe(true);
        });
    });

    describe("isOfBaseclass", () =>
    {
        it("should return true when item has the given base class", () =>
        {
            // ID 590c657e86f77412b013051d is a "Grizzly medical kit" of base class "MedKit".
            const result = itemHelper.isOfBaseclass("590c657e86f77412b013051d", "5448f39d4bdc2d0a728b4568");
            expect(result).toBe(true);
        });

        it("should return false when item does not have the given base class", () =>
        {
            // ID 590c657e86f77412b013051d is a "Grizzly medical kit" not of base class "Knife".
            const result = itemHelper.isOfBaseclass("590c657e86f77412b013051d", "5447e1d04bdc2dff2f8b4567");
            expect(result).toBe(false);
        });
    });

    describe("isOfBaseclasses", () =>
    {
        it("should return true when item has the given base class", () =>
        {
            // ID 590c657e86f77412b013051d is a "Grizzly medical kit" of base class "MedKit".
            const result = itemHelper.isOfBaseclasses("590c657e86f77412b013051d", ["5448f39d4bdc2d0a728b4568"]);
            expect(result).toBe(true);
        });

        it("should return false when item does not have the given base class", () =>
        {
            // ID 590c657e86f77412b013051d is a "Grizzly medical kit" not of base class "Knife".
            const result = itemHelper.isOfBaseclasses("590c657e86f77412b013051d", ["5447e1d04bdc2dff2f8b4567"]);
            expect(result).toBe(false);
        });
    });

    describe("getItemPrice", () =>
    {
        it("should return static price when it is greater than or equal to 1", () =>
        {
            const staticPrice = 1;
            const tpl = "590c657e86f77412b013051d";

            vi.spyOn(itemHelper, "getStaticItemPrice").mockReturnValue(staticPrice);

            const result = itemHelper.getItemPrice(tpl);

            expect(result).toBe(staticPrice);
        });

        it("should return dynamic price when static price is less than 1", () =>
        {
            const staticPrice = 0;
            const dynamicPrice = 42069;
            const tpl = "590c657e86f77412b013051d";

            vi.spyOn(itemHelper, "getStaticItemPrice").mockReturnValue(staticPrice);
            vi.spyOn(itemHelper, "getDynamicItemPrice").mockReturnValue(dynamicPrice);

            const result = itemHelper.getItemPrice(tpl);

            // Failing because getDynamicItemPrice is called incorrectly.
            expect(result).toBe(dynamicPrice);
        });

        it("should return 0 when neither handbook nor dynamic price is available", () =>
        {
            const tpl = "590c657e86f77412b013051d";

            vi.spyOn(itemHelper, "getStaticItemPrice").mockReturnValue(0);
            vi.spyOn(itemHelper, "getDynamicItemPrice").mockReturnValue(0);

            const result = itemHelper.getItemPrice(tpl);

            // Failing because getStaticItemPrice will return 1 on a failed lookup. ???
            expect(result).toBe(0);
        });
    });

    describe("getItemMaxPrice", () =>
    {
        it("should return static price when it is higher", () =>
        {
            const staticPrice = 420;
            const dynamicPrice = 69;
            const tpl = "590c657e86f77412b013051d";

            vi.spyOn(itemHelper, "getStaticItemPrice").mockReturnValue(staticPrice);
            vi.spyOn(itemHelper, "getDynamicItemPrice").mockReturnValue(dynamicPrice);

            const result = itemHelper.getItemMaxPrice(tpl);

            expect(result).toBe(staticPrice);
        });

        it("should return dynamic price when it is higher", () =>
        {
            const staticPrice = 69;
            const dynamicPrice = 420;
            const tpl = "590c657e86f77412b013051d";

            vi.spyOn(itemHelper, "getStaticItemPrice").mockReturnValue(staticPrice);
            vi.spyOn(itemHelper, "getDynamicItemPrice").mockReturnValue(dynamicPrice);

            const result = itemHelper.getItemMaxPrice(tpl);

            expect(result).toBe(dynamicPrice);
        });

        it("should return either when both prices are equal", () =>
        {
            const price = 42069;
            const tpl = "590c657e86f77412b013051d";

            vi.spyOn(itemHelper, "getStaticItemPrice").mockReturnValue(price);
            vi.spyOn(itemHelper, "getDynamicItemPrice").mockReturnValue(price);

            const result = itemHelper.getItemMaxPrice(tpl);

            expect(result).toBe(price);
        });

        it("should return 0 when item does not exist", () =>
        {
            const tpl = "non-existent-item";

            const result = itemHelper.getItemMaxPrice(tpl);

            // Failing because getStaticItemPrice will return 1 on a failed lookup. ???
            expect(result).toBe(0);
        });
    });

    describe("getStaticItemPrice", () =>
    {
        it("should return handbook price when it is greater than or equal to 1", () =>
        {
            const price = 42069;
            const tpl = "590c657e86f77412b013051d";

            const handbookHelperGetTemplatePriceSpy = vi.spyOn((itemHelper as any).handbookHelper, "getTemplatePrice");
            handbookHelperGetTemplatePriceSpy.mockReturnValue(price);

            const result = itemHelper.getStaticItemPrice(tpl);

            expect(result).toBe(price);
        });

        it("should return 0 when handbook price is less than 1", () =>
        {
            const price = 0;
            const tpl = "590c657e86f77412b013051d"; // "Grizzly medical kit"

            const handbookHelperGetTemplatePriceSpy = vi.spyOn((itemHelper as any).handbookHelper, "getTemplatePrice");
            handbookHelperGetTemplatePriceSpy.mockReturnValue(price);

            const result = itemHelper.getStaticItemPrice(tpl);

            expect(result).toBe(price);
        });
    });

    describe("getDynamicItemPrice", () =>
    {
        it("should return the correct dynamic price when it exists", () =>
        {
            const tpl = "590c657e86f77412b013051d"; // "Grizzly medical kit"

            const result = itemHelper.getDynamicItemPrice(tpl);

            expect(result).toBeGreaterThanOrEqual(1);
        });

        it("should return 0 when the dynamic price does not exist", () =>
        {
            const tpl = "non-existent-item";

            const result = itemHelper.getDynamicItemPrice(tpl);

            expect(result).toBe(0);
        });
    });

    describe("fixItemStackCount", () =>
    {
        it("should set upd.StackObjectsCount to 1 if upd is undefined", () =>
        {
            const initialItem: Item = {
                _id: "",
                _tpl: ""
            };
            const fixedItem = itemHelper.fixItemStackCount(initialItem);

            expect(fixedItem.upd).toBeDefined();
            expect(fixedItem.upd!.StackObjectsCount).toBe(1);
        });

        it("should set upd.StackObjectsCount to 1 if upd.StackObjectsCount is undefined", () =>
        {
            const initialItem: Item = {
                _id: "",
                _tpl: "",
                upd: {}
            };
            const fixedItem = itemHelper.fixItemStackCount(initialItem);

            expect(fixedItem.upd).toBeDefined();
            expect(fixedItem.upd!.StackObjectsCount).toBe(1);
        });

        it("should not change upd.StackObjectsCount if it is already defined", () =>
        {
            const initialItem: Item = {
                _id: "",
                _tpl: "",
                upd: {
                    StackObjectsCount: 5
                }
            };
            const fixedItem = itemHelper.fixItemStackCount(initialItem);

            expect(fixedItem.upd).toBeDefined();
            expect(fixedItem.upd!.StackObjectsCount).toBe(5);
        });
    });

    describe("generateItemsFromStackSlot", () =>
    {
        it("should generate valid StackSlot item for an AmmoBox", () =>
        {
            const ammoBox = itemHelper.getItem("57372c89245977685d4159b1"); // "5.45x39mm BT gs ammo pack (30 pcs)"
            const parentId = container.resolve<HashUtil>("HashUtil").generate();

            const result = itemHelper.generateItemsFromStackSlot(ammoBox[1], parentId);

            expect(result.length).toBe(1);
            expect(result[0]._id).toBeDefined();
            expect(result[0]._tpl).toBe(ammoBox[1]._props.StackSlots[0]._props.filters[0].Filter[0]);
            expect(result[0].parentId).toBe(parentId);
            expect(result[0].slotId).toBe("cartridges");
            expect(result[0].location).toBe(0);
            expect(result[0].upd.StackObjectsCount).toBe(ammoBox[1]._props.StackSlots[0]._max_count);
        });

        it("should log a warning if no IDs are found in Filter", () =>
        {
            const ammoBox = itemHelper.getItem("57372c89245977685d4159b1"); // "5.45x39mm BT gs ammo pack (30 pcs)"
            ammoBox[1]._props.StackSlots[0]._props.filters[0].Filter = []; // Empty the Filter array.

            const parentId = container.resolve<HashUtil>("HashUtil").generate();

            // Spy on the logger's warning method and mock its implementation to prevent it from being actually called.
            const loggerWarningSpy = vi.spyOn((itemHelper as any).logger, "warning").mockImplementation(() =>
            {});

            itemHelper.generateItemsFromStackSlot(ammoBox[1], parentId);

            expect(loggerWarningSpy).toHaveBeenCalled();

            // Restore the original behavior
            loggerWarningSpy.mockRestore();
        });

    });

    describe("getItems", () =>
    {
        it("should call databaseServer.getTables() and jsonUtil.clone() methods", () =>
        {
            const databaseServerGetTablesSpy = vi.spyOn((itemHelper as any).databaseServer, "getTables");
            const jsonUtilCloneSpy = vi.spyOn((itemHelper as any).jsonUtil, "clone");

            itemHelper.getItems();

            expect(databaseServerGetTablesSpy).toHaveBeenCalled();
            expect(jsonUtilCloneSpy).toHaveBeenCalled();
        });

        it("should return a new array, not a reference to the original", () =>
        {
            const tables = container.resolve<DatabaseServer>("DatabaseServer").getTables();
            const originalItems = Object.values(tables.templates.items);

            const clonedItems = itemHelper.getItems();

            // Change something in the cloned array
            clonedItems[0]._id = "modified";

            // Validate that the original array remains unchanged
            expect(originalItems[0]._id).not.toBe("modified");
        });
    });

    describe("getItem", () =>
    {
        it("should return true and the item if the tpl exists", () =>
        {
            // ID 590c657e86f77412b013051d is a "Grizzly medical kit".
            const tpl = "590c657e86f77412b013051d";
            const tables = container.resolve<DatabaseServer>("DatabaseServer").getTables();
            const item = tables.templates.items[tpl];

            const [isValid, returnedItem] = itemHelper.getItem(tpl);

            expect(isValid).toBe(true);
            expect(returnedItem).toBe(item);
        });

        it("should return false and undefined if the tpl does not exist", () =>
        {
            const tpl = "non-existent-item";

            const [isValid, returnedItem] = itemHelper.getItem(tpl);

            expect(isValid).toBe(false);
            expect(returnedItem).toBeUndefined();
        });
    });

    describe("isItemInDb", () =>
    {
        it("should return true if getItem returns true as the first element", () =>
        {
            const tpl = "590c657e86f77412b013051d"; // "Grizzly medical kit"

            const result = itemHelper.isItemInDb(tpl);

            expect(result).toBe(true);
        });

        it("should return false if getItem returns false as the first element", () =>
        {
            const tpl = "non-existent-item";

            const result = itemHelper.isItemInDb(tpl);

            expect(result).toBe(false);
        });

        it("should call getItem with the provided tpl", () =>
        {
            const itemHelperSpy = vi.spyOn(itemHelper, "getItem");

            const tpl = "590c657e86f77412b013051d"; // "Grizzly medical kit"

            itemHelper.isItemInDb(tpl);

            expect(itemHelperSpy).toHaveBeenCalledWith(tpl);
        });
    });

    describe("getItemQualityModifier", () =>
    {
        it("should return 1 for an item with no upd", () =>
        {
            const itemId = container.resolve<HashUtil>("HashUtil").generate();
            const item: Item = {
                _id: itemId,
                _tpl: "590c657e86f77412b013051d"  // "Grizzly medical kit"
            };

            const result = itemHelper.getItemQualityModifier(item);

            expect(result).toBe(1);
        });

        it("should return 1 for an item with upd but no relevant fields", () =>
        {
            const itemId = container.resolve<HashUtil>("HashUtil").generate();
            const item: Item = {
                _id: itemId,
                _tpl: "590c657e86f77412b013051d",  // "Grizzly medical kit"
                upd: {}
            };

            const result = itemHelper.getItemQualityModifier(item);

            expect(result).toBe(1);
        });

        it("should return correct value for a medkit", () =>
        {
            const itemId = container.resolve<HashUtil>("HashUtil").generate();
            const item: Item = {
                _id: itemId,
                _tpl: "590c657e86f77412b013051d",  // "Grizzly medical kit"
                upd: {
                    MedKit: {
                        HpResource: 900 // 1800 total
                    }
                }
            };

            const result = itemHelper.getItemQualityModifier(item);

            expect(result).toBe(0.5);
        });

        it("should return correct value for a reparable helmet", () =>
        {
            const itemId = container.resolve<HashUtil>("HashUtil").generate();
            const item: Item = {
                _id: itemId,
                _tpl: "5b40e1525acfc4771e1c6611", // "HighCom Striker ULACH IIIA helmet (Black)"
                upd: {
                    Repairable: {
                        Durability: 19,
                        MaxDurability: 38
                    }
                }
            };

            const result = itemHelper.getItemQualityModifier(item);

            expect(result).toBe(0.5);
        });

        it("should return correct value for a reparable weapon", () =>
        {
            const itemId = container.resolve<HashUtil>("HashUtil").generate();
            const item: Item = {
                _id: itemId,
                _tpl: "5a38e6bac4a2826c6e06d79b", // "TOZ-106 20ga bolt-action shotgun"
                upd: {
                    Repairable: {
                        Durability: 20,
                        MaxDurability: 100
                    }
                }
            };

            const result = itemHelper.getItemQualityModifier(item);

            expect(result).toBeCloseTo(0.447);
        });

        it("should return correct value for a food or drink item", () =>
        {
            const itemId = container.resolve<HashUtil>("HashUtil").generate();
            const item: Item = {
                _id: itemId,
                _tpl: "5448fee04bdc2dbc018b4567", // "Bottle of water (0.6L)"
                upd: {
                    FoodDrink: {
                        HpPercent: 30 // Not actually a percentage, but value of max 60.
                    }
                }
            };

            const result = itemHelper.getItemQualityModifier(item);

            expect(result).toBe(0.5);
        });

        it("should return correct value for a key item", () =>
        {
            const itemId = container.resolve<HashUtil>("HashUtil").generate();
            const item: Item = {
                _id: itemId,
                _tpl: "5780cf7f2459777de4559322", // "Dorm room 314 marked key"
                upd: {
                    Key: {
                        NumberOfUsages: 5
                    }
                }
            };

            const result = itemHelper.getItemQualityModifier(item);

            expect(result).toBe(0.5);
        });

        it("should return correct value for a resource item", () =>
        {
            const itemId = container.resolve<HashUtil>("HashUtil").generate();
            const item: Item = {
                _id: itemId,
                _tpl: "5d1b36a186f7742523398433", // "Metal fuel tank"
                upd: {
                    Resource: {
                        Value: 50, // How much fuel is left in the tank.
                        UnitsConsumed: 50 // How much fuel has been used in the generator.
                    }
                }
            };

            const result = itemHelper.getItemQualityModifier(item);

            expect(result).toBe(0.5);
        });

        it("should return correct value for a repair kit item", () =>
        {
            const itemId = container.resolve<HashUtil>("HashUtil").generate();
            const item: Item = {
                _id: itemId,
                _tpl: "591094e086f7747caa7bb2ef", // "Body armor repair kit"
                upd: {
                    RepairKit: {
                        Resource: 600
                    }
                }
            };

            const result = itemHelper.getItemQualityModifier(item);

            expect(result).toBe(0.5);
        });

        it("should return 0.01 for an item with upd but all relevant fields are 0", () =>
        {
            const itemId = container.resolve<HashUtil>("HashUtil").generate();
            const item: Item = {
                _id: itemId,
                _tpl: "591094e086f7747caa7bb2ef", // "Body armor repair kit"
                upd: {
                    RepairKit: {
                        Resource: 0
                    }
                }
            };

            const result = itemHelper.getItemQualityModifier(item);

            expect(result).toBe(0.01);
        });
    });

    describe("getRepairableItemQualityValue", () =>
    {
        it("should return the correct quality value for armor items", () =>
        {
            const armor = itemHelper.getItem("5648a7494bdc2d9d488b4583")[1];  // "PACA Soft Armor"
            const repairable: Repairable = {
                Durability: 25,
                MaxDurability: 50
            };
            const item: Item = { // Not used for armor, but required for the method.
                _id: "",
                _tpl: ""
            };

            // Cast the method to any to allow access to private/protected method.
            const result = (itemHelper as any).getRepairableItemQualityValue(armor, repairable, item);

            expect(result).toBe(0.5);
        });

        it("should not use the Repairable MaxDurability property for armor", () =>
        {
            const armor = itemHelper.getItem("5648a7494bdc2d9d488b4583")[1];  // "PACA Soft Armor"
            const repairable: Repairable = {
                Durability: 25,
                MaxDurability: 1000 // This should be ignored.
            };
            const item: Item = { // Not used for armor, but required for the method.
                _id: "",
                _tpl: ""
            };

            // Cast the method to any to allow access to private/protected method.
            const result = (itemHelper as any).getRepairableItemQualityValue(armor, repairable, item);

            expect(result).toBe(0.5);
        });

        it("should return the correct quality value for weapon items", () =>
        {
            const weapon = itemHelper.getItem("5a38e6bac4a2826c6e06d79b")[1];  // "TOZ-106 20ga bolt-action shotgun"
            const repairable: Repairable = {
                Durability: 50,
                MaxDurability: 100
            };
            const item: Item = {
                _id: "",
                _tpl: ""
            };

            // Cast the method to any to allow access to private/protected method.
            const result = (itemHelper as any).getRepairableItemQualityValue(weapon, repairable, item);

            expect(result).toBe(Math.sqrt(0.5));
        });

        it("should fall back to using Repairable MaxDurability for weapon items", () =>
        {
            const weapon = itemHelper.getItem("5a38e6bac4a2826c6e06d79b")[1];  // "TOZ-106 20ga bolt-action shotgun"
            weapon._props.MaxDurability = undefined; // Remove the MaxDurability property.
            const repairable: Repairable = {
                Durability: 50,
                MaxDurability: 200 // This should be used now.
            };
            const item: Item = {
                _id: "",
                _tpl: ""
            };

            // Cast the method to any to allow access to private/protected method.
            const result = (itemHelper as any).getRepairableItemQualityValue(weapon, repairable, item);

            expect(result).toBe(Math.sqrt(0.25));
        });

        it("should return 1 if durability value is invalid", () =>
        {
            const weapon = itemHelper.getItem("5a38e6bac4a2826c6e06d79b")[1];  // "TOZ-106 20ga bolt-action shotgun"
            weapon._props.MaxDurability = undefined; // Remove the MaxDurability property.
            const repairable: Repairable = {
                Durability: 50,
                MaxDurability: undefined // Remove the MaxDurability property value... Technically an invalid Type.
            };
            const item: Item = {
                _id: "",
                _tpl: ""
            };

            // Mock the logger's error method to prevent it from being actually called.
            const loggerErrorSpy = vi.spyOn((itemHelper as any).logger, "error").mockImplementation(() =>
            {});

            // Cast the method to any to allow access to private/protected method.
            const result = (itemHelper as any).getRepairableItemQualityValue(weapon, repairable, item);

            expect(loggerErrorSpy).toHaveBeenCalled();
            expect(result).toBe(1);
        });

        it("should not divide by zero", () =>
        {
            const weapon = itemHelper.getItem("5a38e6bac4a2826c6e06d79b")[1];  // "TOZ-106 20ga bolt-action shotgun"
            weapon._props.MaxDurability = undefined; // Remove the MaxDurability property.
            const repairable: Repairable = {
                Durability: 50,
                MaxDurability: 0 // This is a problem.
            };
            const item: Item = {
                _id: "",
                _tpl: ""
            };

            // Cast the method to any to allow access to private/protected method.
            const result = (itemHelper as any).getRepairableItemQualityValue(weapon, repairable, item);

            expect(result).toBe(1);
        });

        it("should log an error if durability is invalid", () =>
        {
            const weapon = itemHelper.getItem("5a38e6bac4a2826c6e06d79b")[1];  // "TOZ-106 20ga bolt-action shotgun"
            weapon._props.MaxDurability = undefined; // Remove the MaxDurability property.
            const repairable: Repairable = {
                Durability: 50,
                MaxDurability: undefined // Remove the MaxDurability property value... Technically an invalid Type.
            };
            const item: Item = {
                _id: "",
                _tpl: ""
            };

            const loggerErrorSpy = vi.spyOn((itemHelper as any).logger, "error");

            // Cast the method to any to allow access to private/protected method.
            (itemHelper as any).getRepairableItemQualityValue(weapon, repairable, item);

            expect(loggerErrorSpy).toBeCalled();
        });
    });

    describe("findAndReturnChildrenByItems", () =>
    {
        it("should return an array containing only the parent ID when no children are found", () =>
        {
            const items: Item[] = [
                { _id: "1", _tpl: "", parentId: null },
                { _id: "2", _tpl: "", parentId: null },
                { _id: "3", _tpl: "", parentId: "2" }
            ];
            const result = itemHelper.findAndReturnChildrenByItems(items, "1");
            expect(result).toEqual(["1"]);
        });

        it("should return array of child IDs when single-level children are found", () =>
        {
            const items: Item[] = [
                { _id: "1", _tpl: "", parentId: null },
                { _id: "2", _tpl: "", parentId: "1" },
                { _id: "3", _tpl: "", parentId: "1" }
            ];
            const result = itemHelper.findAndReturnChildrenByItems(items, "1");
            expect(result).toEqual(["2", "3", "1"]);
        });

        it("should return array of child IDs when multi-level children are found", () =>
        {
            const items: Item[] = [
                { _id: "1", _tpl: "", parentId: null },
                { _id: "2", _tpl: "", parentId: "1" },
                { _id: "3", _tpl: "", parentId: "2" },
                { _id: "4", _tpl: "", parentId: "3" }
            ];
            const result = itemHelper.findAndReturnChildrenByItems(items, "1");
            expect(result).toEqual(["4", "3", "2", "1"]);
        });

        it("should return an array containing only the parent ID when parent ID does not exist in items", () =>
        {
            const items: Item[] = [
                { _id: "1", _tpl: "", parentId: null },
                { _id: "2", _tpl: "", parentId: "1" }
            ];
            const result = itemHelper.findAndReturnChildrenByItems(items, "3");
            expect(result).toEqual(["3"]);
        });
    });
});
