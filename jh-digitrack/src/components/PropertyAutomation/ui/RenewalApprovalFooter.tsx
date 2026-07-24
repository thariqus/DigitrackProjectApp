import { Button } from "@/components/ui/button";
import React from "react";

type RenewalApprovalFooterProps = {
  disabledWithdraw: boolean;
  disabledSendBack: boolean;
  renderDelegationActionButton: () => React.ReactNode;
  onWithdraw: () => void;
  onSendBack: () => void;
  approveButton: {
    onApprove: () => void;
    title: string;
    description: string;
  };
};

export default function RenewalApprovalFooter({
  disabledWithdraw,
  disabledSendBack,
  renderDelegationActionButton,
  onWithdraw,
  onSendBack,
  approveButton,
}: RenewalApprovalFooterProps) {
  return (
    <div className="flex gap-3 w-full">
      <Button
        className="w-full bg-rose-200 hover:bg-rose-100 text-gray-500"
        type="button"
        disabled={disabledWithdraw}
        title="Closes the renewal process entirely. If needed, initiators can duplicate or create a new process for that property."
        onClick={onWithdraw}
      >
        Withdraw
      </Button>

      <Button
        className="w-full bg-rose-200 hover:bg-rose-100 text-gray-500"
        type="button"
        disabled={disabledSendBack}
        onClick={onSendBack}
      >
        Send Back
      </Button>

      {renderDelegationActionButton()}

      <Button
        className="w-full bg-primary text-white"
        type="button"
        onClick={approveButton.onApprove}
      >
        Approve
      </Button>
    </div>
  );
}

