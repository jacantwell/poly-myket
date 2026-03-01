"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiClientError } from "@/lib/api";
import type { WagerSide } from "@/lib/types";

interface WagerFormProps {
  betId: string;
  isOpen: boolean;
  creditBalance: number;
  yesPrice: number;
  noPrice: number;
  onWagerPlaced: () => void;
}

export function WagerForm({
  betId,
  isOpen,
  creditBalance,
  yesPrice,
  noPrice,
  onWagerPlaced,
}: WagerFormProps) {
  const [selectedSide, setSelectedSide] = useState<WagerSide | null>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  function toggleSide(side: WagerSide) {
    if (selectedSide === side) {
      setSelectedSide(null);
      setAmount("");
    } else {
      setSelectedSide(side);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSide || !amount || Number(amount) <= 0) return;

    setSubmitting(true);
    try {
      await api.placeWager(betId, { side: selectedSide, amount: Number(amount) });
      toast.success("Wager placed!");
      setSelectedSide(null);
      setAmount("");
      onWagerPlaced();
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message || "Failed to place wager.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className={
            selectedSide === "yes"
              ? "bg-yes text-white hover:bg-yes/90 hover:text-white"
              : "bg-yes-light text-yes hover:bg-yes hover:text-white"
          }
          onClick={() => toggleSide("yes")}
        >
          Yes {yesPrice.toFixed(2)}
        </Button>
        <Button
          type="button"
          variant="outline"
          className={
            selectedSide === "no"
              ? "bg-no text-white hover:bg-no/90 hover:text-white"
              : "bg-no-light text-no hover:bg-no hover:text-white"
          }
          onClick={() => toggleSide("no")}
        >
          No {noPrice.toFixed(2)}
        </Button>
      </div>

      {selectedSide && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <Input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting}
          />
          <p className="text-xs text-muted-foreground">
            Available: {creditBalance.toFixed(0)} credits
          </p>
          <Button
            type="submit"
            className="w-full"
            disabled={submitting || !amount || Number(amount) <= 0}
          >
            {submitting ? "Placing..." : "Place Wager"}
          </Button>
        </form>
      )}
    </div>
  );
}
