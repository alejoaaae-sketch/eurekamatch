import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FlaskConical, Loader2 } from "lucide-react";

interface PaymentSimulationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentComplete: () => void | Promise<void>;
  action: "add" | "change";
  amount?: number;
}

const PaymentSimulationModal = ({ open, onOpenChange, onPaymentComplete }: PaymentSimulationModalProps) => {
  const [processing, setProcessing] = useState(false);

  const handleSimulate = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      await onPaymentComplete();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!processing) onOpenChange(nextOpen); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5" />
            Créditos de prueba · Solo administrador
          </DialogTitle>
          <DialogDescription>
            No se realizará ningún pago. Esta prueba no solicita ni utiliza datos de tarjeta.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" disabled={processing} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={processing} onClick={handleSimulate}>
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
            Añadir créditos de prueba
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentSimulationModal;
