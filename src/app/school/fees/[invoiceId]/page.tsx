import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { loadFeeInvoiceForPayer } from '@/lib/institution-payments/fee-actions';
import { FeePaymentCheckout } from '@/components/features/institution-payments/FeePaymentCheckout';

export default async function SchoolFeePaymentPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  const { user, context } = await requireSchoolContext('dashboard.read');
  if (!user) redirect('/login?redirect=%2Fschool');
  if (!context) redirect('/dashboard');

  const loaded = await loadFeeInvoiceForPayer('school', invoiceId);
  if (!loaded) redirect('/school');

  const outstanding = Math.max(0, Number(loaded.invoice.total_amount) - Number(loaded.invoice.paid_amount));

  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-lg space-y-6 p-4 sm:p-6">
        <Link href="/school" className="text-muted-foreground text-sm underline">
          &larr; Back to school portal
        </Link>
        {outstanding <= 0 ? (
          <p className="text-muted-foreground text-sm">This voucher has no outstanding balance.</p>
        ) : (
          <FeePaymentCheckout
            institutionType="school"
            invoiceId={loaded.invoice.id}
            voucherNumber={loaded.invoice.voucher_number}
            outstanding={outstanding}
            currency={context.organization.currency}
            defaultContactEmail={loaded.contactEmail}
          />
        )}
      </div>
    </main>
  );
}
