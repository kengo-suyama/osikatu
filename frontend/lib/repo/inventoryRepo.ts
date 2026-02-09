import { isApiMode } from "@/lib/config";
import { apiGet, apiSend } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";
import type {
  InventoryApplyRequestDto,
  InventoryApplyResponseDto,
  MeInventoryResponseDto,
} from "@/lib/types";

export const inventoryRepo = {
  async getMeInventory(): Promise<MeInventoryResponseDto | null> {
    if (!isApiMode()) return null;
    try {
      return await apiGet<MeInventoryResponseDto>("/api/me/inventory", {
        headers: { "X-Device-Id": getDeviceId() },
      });
    } catch {
      return null;
    }
  },

  async apply(payload: InventoryApplyRequestDto): Promise<InventoryApplyResponseDto | null> {
    if (!isApiMode()) return null;
    try {
      return await apiSend<InventoryApplyResponseDto>("/api/me/inventory/apply", "POST", payload, {
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": getDeviceId(),
        },
      });
    } catch {
      return null;
    }
  },
};

