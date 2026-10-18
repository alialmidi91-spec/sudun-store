import { Link } from 'react-router-dom';
import { Accordion, PageHeader } from '../components/ui';
import { faqGroups, faqs, type Faq } from '../data/faqs';
import { useSeo } from '../hooks/useSeo';

export default function FaqPage() {
  useSeo({ title: 'الأسئلة الشائعة', description: 'إجابات عن الطلب عبر واتساب، التوصيل، الدفع عند الاستلام، والاستبدال في سُدَن.' });
  const groups = Object.keys(faqGroups) as Faq['group'][];

  return (
    <>
      <PageHeader eyebrow="المساعدة" title="الأسئلة الشائعة" intro="جمعنا أكثر الأسئلة اللي توصلنا. ما لگيتي جوابچ؟ راسلينا." />
      <section className="container container--narrow section">
        {groups.map((g) => (
          <div key={g} className="faq-group">
            <h2 className="subhead">{faqGroups[g]}</h2>
            <Accordion items={faqs.filter((f) => f.group === g)} />
          </div>
        ))}
        <p className="center-text">
          <Link to="/contact" className="btn btn--dark">عندي سؤال ثاني</Link>
        </p>
      </section>
    </>
  );
}
