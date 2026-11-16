import AdsterraNativeBanner from "./AdsterraNativeBanner";
import { getNativeUnit, type NativeSlot } from "@/lib/ads";

/**
 * Server component: renders nothing at all if the slot's env var is not configured,
 * so there are never empty "ad" boxes on the page.
 */
export default function AdSlot({ slot, className = "" }: { slot: NativeSlot; className?: string }) {
  const unit = getNativeUnit(slot);
  if (!unit) return null;

  return <AdsterraNativeBanner unit={unit} className={className} />;
}
