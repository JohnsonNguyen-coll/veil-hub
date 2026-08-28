import { docsTopics, docsBySlug } from "../constants/docsData.js";
import { APP_ROUTES } from "../constants/options.js";
import { VeilButton } from "../components/common/VeilButton.jsx";
import { Footer } from "../components/layout/Footer.jsx";

export function DocsPage({ docsSection, navigate }) {
  const topic = docsBySlug[docsSection];

  if (topic) {
    return <DocsDetailPage navigate={navigate} topic={topic} />;
  }

  return (
    <>
      <main className="flex-grow pt-32 pb-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full flex flex-col gap-16">
        <section className="border-y border-veil-gray-light py-12">
          <span className="font-label-caps text-label-caps text-veil-purple uppercase">Protocol Docs</span>
          <h1 className="font-headline-xl text-[44px] md:text-[64px] leading-tight text-veil-white font-bold tracking-tighter uppercase mt-4">
            VeilHubs
            <br />
            Product Notes
          </h1>
          <p className="font-body-md text-body-md text-veil-white opacity-75 max-w-3xl text-lg mt-5">
            Choose a topic to inspect the product, privacy model, draw mechanism, and production boundaries in detail.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-0 border border-veil-gray-light">
          {docsTopics.map((item) => (
            <DocsTopicCard item={item} key={item.slug} navigate={navigate} />
          ))}
        </section>

        <section className="flex flex-col gap-8 border-t border-veil-gray-light pt-12">
          <div className="max-w-3xl flex flex-col gap-3 pb-4 border-b border-veil-gray-light">
            <span className="font-label-caps text-label-caps text-veil-purple uppercase">Reading Order</span>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-veil-white font-bold uppercase tracking-tight">
              Recommended Path
            </h2>
            <p className="font-body-md text-body-md text-veil-white opacity-75">
              Start with the product overview, then inspect product surfaces, privacy model, and prize draw mechanics before reviewing production boundaries.
            </p>
          </div>
          <div className="border border-veil-gray-light">
            {docsTopics.map((item, index) => (
              <button
                className="grid grid-cols-[64px_1fr_auto] gap-4 w-full text-left p-5 border-b last:border-b-0 border-veil-gray-light hover:bg-veil-gray-dark transition-colors"
                key={item.slug}
                onClick={() => navigate(`/docs/${item.slug}`)}
                type="button"
              >
                <span className="font-data-sm text-data-sm text-veil-purple">{String(index + 1).padStart(2, "0")}</span>
                <span>
                  <span className="font-data-sm text-data-sm text-veil-white uppercase">{item.title}</span>
                  <span className="block font-body-md text-body-md text-veil-white opacity-60 mt-1">{item.summary}</span>
                </span>
                <svg className="w-5 h-5 text-veil-white opacity-60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function DocsTopicCard({ item, navigate }) {
  return (
    <button
      className="bg-veil-gray-dark p-6 border-r border-b border-veil-gray-light min-h-[300px] text-left hover:bg-[#242424] scramble-hover transition-all duration-300"
      onClick={() => navigate(`/docs/${item.slug}`)}
      type="button"
    >
      <span className="font-label-caps text-label-caps text-veil-purple uppercase">{item.eyebrow}</span>
      <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-veil-white uppercase mt-5">{item.title}</h2>
      <p className="font-body-md text-body-md text-veil-white opacity-70 mt-4">{item.summary}</p>
      <div className="mt-8 pt-4 border-t border-veil-gray-light flex items-center justify-between gap-4">
        <span className="font-data-sm text-data-sm text-veil-white opacity-70 uppercase">{item.status}</span>
        <svg className="w-5 h-5 text-veil-white opacity-60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </button>
  );
}

function DocsDetailPage({ navigate, topic }) {
  return (
    <>
      <main className="flex-grow pt-32 pb-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full flex flex-col gap-12">
        <section className="border-y border-veil-gray-light py-10">
          <button className="font-data-sm text-data-sm text-veil-white opacity-60 hover:opacity-100 uppercase mb-8" onClick={() => navigate("/docs")} type="button">
            &lt; Back to docs
          </button>
          <span className="block font-label-caps text-label-caps text-veil-purple uppercase">{topic.eyebrow}</span>
          <h1 className="font-headline-xl text-[44px] md:text-[64px] leading-tight text-veil-white font-bold tracking-tighter uppercase mt-4">
            {topic.title}
          </h1>
          <p className="font-body-md text-body-md text-veil-white opacity-75 max-w-3xl text-lg mt-5">{topic.summary}</p>
          <div className="mt-8">
            <span className="font-data-sm text-data-sm text-veil-white opacity-70 uppercase">&gt; {topic.status}</span>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10">
          <aside className="lg:sticky lg:top-28 h-fit border border-veil-gray-light">
            <div className="px-5 py-4 border-b border-veil-gray-light">
              <span className="font-label-caps text-label-caps text-veil-white opacity-60 uppercase">Docs Index</span>
            </div>
            {docsTopics.map((item) => (
              <button
                className={`w-full text-left px-5 py-4 border-b last:border-b-0 border-veil-gray-light transition-colors ${
                  item.slug === topic.slug ? "bg-veil-purple text-veil-white" : "text-veil-white opacity-70 hover:opacity-100 hover:bg-veil-gray-dark"
                }`}
                key={item.slug}
                onClick={() => navigate(`/docs/${item.slug}`, { scrollToTop: false })}
                type="button"
              >
                <span className="font-label-caps text-label-caps uppercase">{item.title}</span>
              </button>
            ))}
          </aside>

          <article className="flex flex-col gap-8">
            {topic.sections.map((section, index) => (
              <section className="border border-veil-gray-light bg-veil-black" key={section.title}>
                <div className="grid grid-cols-1 md:grid-cols-[96px_1fr] border-b border-veil-gray-light">
                  <div className="bg-veil-gray-dark p-5">
                    <span className="font-data-sm text-data-sm text-veil-purple">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="p-5">
                    <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-veil-white uppercase">{section.title}</h2>
                  </div>
                </div>
                <div className="p-6 md:p-8">
                  <p className="font-body-md text-body-md text-veil-white opacity-75 text-lg leading-8">{section.body}</p>
                </div>
              </section>
            ))}

            <SpecPanel rows={topic.rows} title="Reference Notes" />

            <section className="border border-veil-gray-light bg-veil-gray-dark p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="font-label-caps text-label-caps text-veil-purple uppercase">Next Step</span>
                <p className="font-body-md text-body-md text-veil-white opacity-75 mt-2">Continue reading another section or launch the application workspace.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <VeilButton onClick={() => navigate("/docs")} variant="secondary">Docs Index</VeilButton>
                <VeilButton onClick={() => navigate(APP_ROUTES.dashboard)}>Launch App</VeilButton>
              </div>
            </section>
          </article>
        </section>
      </main>
      <Footer />
    </>
  );
}

function SpecPanel({ rows, title }) {
  return (
    <div className="border border-veil-gray-light bg-veil-black">
      <div className="px-5 py-4 border-b border-veil-gray-light">
        <span className="font-label-caps text-label-caps text-veil-white opacity-60 uppercase">{title}</span>
      </div>
      <div>
        {rows.map(([label, value]) => (
          <div className="grid grid-cols-[120px_1fr] gap-4 p-5 border-b last:border-b-0 border-veil-gray-light" key={label}>
            <span className="font-label-caps text-label-caps text-veil-purple uppercase">{label}</span>
            <span className="font-body-md text-body-md text-veil-white opacity-75">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
