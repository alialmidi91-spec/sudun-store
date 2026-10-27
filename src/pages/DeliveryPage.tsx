import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui';
import { siteConfig } from '../config/site';
import { useCatalog } from '../hooks/useCatalog';
import { useSeo } from '../hooks/useSeo';
import { formatIQD } from '../lib/format';

/** سياسة التوصيل — حسب المعلومات التي أكدها المتجر */
export default function DeliveryPage() {
  useSeo({ title: 'التوصيل والدفع', description: 'توصيل لجميع محافظات العراق خلال 24 ساعة، والدفع عند الاستلام.' });
  const special = Object.entries(siteConfig.deliveryFees).filter(([, v]) => typeof v === 'number') as [string, number][];
  const { products } = useCatalog();
  const offers = products.filter((p) => p.offer);

  return (
    <>
      <PageHeader eyebrow="السياسات" title="التوصيل والدفع" />
      <section className="container container--narrow prose section">
        <h2>مناطق التوصيل ومدته</h2>
        <p>نوصّل لجميع محافظات العراق، ومدة التوصيل {siteConfig.deliveryTime}.</p>

        <h2>أجور التوصيل</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>المحافظة</th><th>الأجور</th></tr></thead>
            <tbody>
              {special.map(([g, f]) => <tr key={g}><td>{g}</td><td>{formatIQD(f)}</td></tr>)}
              {siteConfig.defaultDeliveryFee !== null && (
                <tr><td>باقي المحافظات</td><td>{formatIQD(siteConfig.defaultDeliveryFee)}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {offers.length > 0 && (
          <>
            <h2>عروض فيها توصيل مجاني</h2>
            <ul>
              {offers.map((p) => (
                <li key={p.id}>
                  <Link to={`/product/${p.slug}`}>{p.name}</Link>: كل {p.offer!.quantity} قطع بـ {formatIQD(p.offer!.price)}
                  {p.offer!.freeDelivery ? ' مع توصيل مجاني' : ''}.
                </li>
              ))}
            </ul>
          </>
        )}

        <h2>طريقة الطلب</h2>
        <ol>
          <li>تضيفين المنتجات للسلة وتكتبين معلومات التوصيل.</li>
          <li>تنفتح محادثة واتساب برسالة جاهزة، وتضغطين «إرسال». (أو تطلبين برسالة على إنستغرام {siteConfig.instagramHandle})</li>
          <li>نأكد الطلب وياچ، وبعدها يطلع للتوصيل.</li>
        </ol>
        <p>الطلب لا يُعتبر مؤكداً إلا بعد إرسال الرسالة وتأكيده من المتجر.</p>

        <h2>الدفع</h2>
        <p><strong>الدفع عند الاستلام</strong>. ما نطلب أي دفع مسبق أو معلومات بطاقة بنكية.</p>

        <p>للاستبدال والإرجاع راجعي <Link to="/returns">سياسة الاستبدال والإرجاع</Link>.</p>
      </section>
    </>
  );
}
