import Image from 'next/image'

export function Editor() {
  return (
    <section className="px-6 md:px-12 lg:px-20 mt-6">
      <div className="max-w-7xl mx-auto rounded-2xl nice-shadow overflow-hidden pt-10 md:pt-14 px-10 md:px-16 relative bg-white">
        {/* Subtle background grid pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,black,transparent)]"
        />

        {/* Heading + description */}
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-[28px] md:text-[36px] font-bold tracking-tight text-black leading-tight">
            TRACE workspace for evidence, sources, and comparison.
          </h2>
          <p className="mt-4 text-base md:text-lg text-black/60 leading-relaxed">
            Review university evidence in one place. See categories, links, provenance, and uncertainty before you make a decision.
          </p>
        </div>

        {/* Browser-like preview window */}
        <div className="relative mt-10 md:mt-12 mb-10 md:mb-14">
          <div className="rounded-t-xl bg-neutral-100 border border-neutral-200 px-4 py-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <span className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex-1 mx-2">
              <div className="bg-white rounded-md border border-neutral-200 px-3 py-1 text-xs text-neutral-400 font-medium truncate text-center">
                trace.app/evidence
              </div>
            </div>
          </div>
          <div className="relative rounded-b-xl overflow-hidden bg-white">
            <Image
              src="/trace-landing/editor-preview.png"
              alt="TRACE evidence workspace preview"
              width={3212}
              height={1160}
              sizes="(max-width: 768px) 100vw, 80rem"
              className="w-full h-auto block"
              loading="lazy"
            />
            <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4 rounded-full bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5">
              Evidence workspace
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Editor;
