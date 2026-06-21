import { Navigate, useSearchParams } from 'react-router-dom';

/** Legacy route — unified with Standard Templates picker (`?new=1`). */
const TemplatePicker = () => {
  const [searchParams] = useSearchParams();
  const next = new URLSearchParams(searchParams);
  next.set('new', '1');
  return <Navigate to={`/templates?${next.toString()}`} replace />;
};

export default TemplatePicker;
