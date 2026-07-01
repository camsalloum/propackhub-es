import { useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutTemplate, PencilRuler, ArrowRight, Lock, Unlock } from 'lucide-react';
import { SectionTitle } from '../components/SectionTitle';

/**
 * New-estimate chooser: two clear starting points.
 *  - Template  → predefined, structure-locked stack (fast path for standard products).
 *  - Scratch   → fully editable, build the layer stack from nothing (custom jobs).
 * The customer query param (if present, e.g. from a customer page) is carried through
 * to whichever path the user picks so the new estimate stays linked to that customer.
 */
const EstimateStart = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customer = searchParams.get('customer')?.trim() || '';
  const customerQs = customer ? `?customer=${encodeURIComponent(customer)}` : '';

  const startFromTemplate = () => navigate(`/templates${customerQs}`);
  const startFromScratch = () => navigate(`/estimate/new${customerQs}`);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <SectionTitle
          as="h1"
          className="text-2xl lg:text-3xl font-display font-bold text-navy"
          hint="Choose how you want to start. You can always change the details later."
        >
          New estimate
        </SectionTitle>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={startFromTemplate}
          className="card text-left p-6 flex flex-col gap-4 transition-transform duration-micro ease-micro hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <div className="flex items-center justify-between">
            <span className="w-12 h-12 rounded-xl bg-accent-soft text-accent-text flex items-center justify-center">
              <LayoutTemplate className="w-6 h-6" />
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary">
              <Lock className="w-3.5 h-3.5" /> Structure locked
            </span>
          </div>
          <div>
            <h2 className="font-display font-semibold text-lg text-brand mb-1">Start from a template</h2>
            <p className="text-sm text-text-secondary">
              Pick a predefined structure. The substrate stack is fixed — you adjust grades, inks,
              coatings, quantities and pricing. Fastest for standard, repeat products.
            </p>
          </div>
          <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-accent-text">
            Browse templates <ArrowRight className="w-4 h-4" />
          </span>
        </button>

        <button
          type="button"
          onClick={startFromScratch}
          className="card text-left p-6 flex flex-col gap-4 transition-transform duration-micro ease-micro hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <div className="flex items-center justify-between">
            <span className="w-12 h-12 rounded-xl bg-surface-base text-brand flex items-center justify-center border border-border">
              <PencilRuler className="w-6 h-6" />
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary">
              <Unlock className="w-3.5 h-3.5" /> Full control
            </span>
          </div>
          <div>
            <h2 className="font-display font-semibold text-lg text-brand mb-1">Start from scratch</h2>
            <p className="text-sm text-text-secondary">
              Define everything yourself: choose the product type, then build the layer stack —
              substrates, adhesives, inks. Best for custom or one-off jobs.
            </p>
          </div>
          <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-accent-text">
            Build from blank <ArrowRight className="w-4 h-4" />
          </span>
        </button>
      </div>
    </div>
  );
};

export default EstimateStart;
