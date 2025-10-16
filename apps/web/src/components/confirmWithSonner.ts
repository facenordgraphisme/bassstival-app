"use client";
import { toast } from "sonner";

export function confirmWithSonner(
  title: string,
  description?: string,
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler"
) {
  return new Promise<boolean>((resolve) => {
    // Sonner v1 propose 'action' + 'cancel' — parfait pour une “modal” simple en toast.
    const id = toast(title, {
      description,
      duration: Infinity,
      action: {
        label: confirmLabel,
        onClick: () => {
          toast.dismiss(id);
          resolve(true);
        },
      },
      cancel: {
        label: cancelLabel,
        onClick: () => {
          toast.dismiss(id);
          resolve(false);
        },
      },
    });
  });
}
