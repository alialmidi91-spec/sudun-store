import { Link } from 'react-router-dom';
import { FabricArt } from '../components/FabricArt';
import { useSeo } from '../hooks/useSeo';

export default function NotFoundPage({ message }: { message?: string }) {
  useSeo({ title: 'الصفحة غير موجودة', noindex: true });
  return (
    <section className="container not-found">
      <div className="not-found__art" aria-hidden="true">
        <FabricArt color="#E7DCCB" seed="404" shape="square" />
        <span className="not-found__code" lang="en">404</span>
      </div>
      <h1 className="page-title">ضاعت الطيّة هنا</h1>
      <p className="page-intro">{message ?? 'الصفحة اللي تدورين عليها غير موجودة أو تغيّر رابطها.'}</p>
      <div className="not-found__actions">
        <Link to="/" className="btn btn--dark">الرئيسية</Link>
        <Link to="/shop" className="btn btn--outline">تصفحي الحجابات</Link>
      </div>
    </section>
  );
}
