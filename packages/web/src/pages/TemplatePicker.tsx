import { Navigate, useSearchParams } from 'react-router-dom';

/** Legacy routes → unified Templates page. */
const TemplatePicker = () => {
  const [searchParams] = useSearchParams();
  const next = new URLSearchParams(searchParams);
  next.delete('new');
  const qs = next.toString();
  return <Navigate to={`/templates${qs ? `?${qs}` : ''}`} replace />;
};

export default TemplatePicker;
