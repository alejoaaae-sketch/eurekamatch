import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PaymentSimulationModal from '@/components/PaymentSimulationModal';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('card-free admin credit simulation', () => {
  it('runs only the test-credit callback, without sending a payment request', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const complete = vi.fn(async () => {});
    render(<PaymentSimulationModal open onOpenChange={vi.fn()} onPaymentComplete={complete} action="add" amount={3} />);
    fireEvent.click(screen.getByRole('button', { name: 'Añadir créditos de prueba' }));
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not grant test credits when cancelled', () => {
    const complete = vi.fn();
    const close = vi.fn();
    render(<PaymentSimulationModal open onOpenChange={close} onPaymentComplete={complete} action="add" />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(close).toHaveBeenCalledWith(false);
    expect(complete).not.toHaveBeenCalled();
  });
});
