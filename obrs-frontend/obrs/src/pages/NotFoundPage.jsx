import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-brand-600">404</p>
      <h1 className="text-xl font-bold">This route doesn&apos;t exist</h1>
      <p className="text-sm text-ink-500">Looks like this bus took a wrong turn.</p>
      <Link to="/" className="btn-primary mt-2">Back to home</Link>
    </div>
  );
}
