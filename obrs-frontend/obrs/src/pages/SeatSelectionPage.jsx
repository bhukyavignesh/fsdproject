import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BusCard from '../components/buses/BusCard';
import Spinner from '../components/ui/Spinner';
import { getBusById } from '../services/api';

/** Deep-linkable seat selection (/buses/:busId/seats) — reuses BusCard expanded. */
export default function SeatSelectionPage() {
  const { busId } = useParams();
  const [bus, setBus] = useState(null);

  useEffect(() => { getBusById(busId).then(setBus); }, [busId]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {bus && <Link to={`/buses?from=${bus.from}&to=${bus.to}&date=${bus.date}`} className="btn-ghost -ml-3 mb-3 !py-1.5"><ArrowLeft className="h-4 w-4" /> All buses</Link>}
      {bus ? <BusCard bus={bus} expanded onToggle={() => {}} /> : <div className="flex justify-center py-24"><Spinner className="h-6 w-6" /></div>}
    </div>
  );
}
