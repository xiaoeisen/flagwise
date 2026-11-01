import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { flagUrl } from '../../domain/catalog';

interface FlagGalleryProps {
  codes: readonly string[];
}

export function FlagGallery({ codes }: FlagGalleryProps): React.ReactElement {
  const stageRef = useRef<HTMLDivElement>(null);
  const firstTrackRef = useRef<HTMLDivElement>(null);
  const secondTrackRef = useRef<HTMLDivElement>(null);
  const firstRunRef = useRef<HTMLDivElement>(null);
  const secondRunRef = useRef<HTMLDivElement>(null);
  const firstLane = codes.filter((_, index) => index % 2 === 0);
  const secondLane = codes.filter((_, index) => index % 2 === 1);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const firstTrack = firstTrackRef.current;
    const secondTrack = secondTrackRef.current;
    const firstRun = firstRunRef.current;
    const secondRun = secondRunRef.current;
    if (!stage || !firstTrack || !secondTrack || !firstRun || !secondRun) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let ready = false;
    let inView = false;
    let measuredFirst = 0;
    let measuredSecond = 0;
    let timer = 0;
    let frame = 0;
    let context: gsap.Context | undefined;
    let firstTween: gsap.core.Tween | undefined;
    let secondTween: gsap.core.Tween | undefined;

    const initialize = () => {
      if (!ready || stage.getBoundingClientRect().width <= 0) return;
      const firstWidth = firstRun.getBoundingClientRect().width;
      const secondWidth = secondRun.getBoundingClientRect().width;
      if (firstWidth <= 0 || secondWidth <= 0) return;
      if (Math.abs(firstWidth - measuredFirst) < 1 && Math.abs(secondWidth - measuredSecond) < 1) return;

      measuredFirst = firstWidth;
      measuredSecond = secondWidth;
      context?.revert();
      context = gsap.context(() => {
        gsap.set(firstTrack, { x: 0 });
        gsap.set(secondTrack, { x: -secondWidth });
        firstTween = gsap.to(firstTrack, {
          x: -firstWidth,
          duration: firstWidth / 76,
          ease: 'none',
          repeat: -1,
        });
        secondTween = gsap.to(secondTrack, {
          x: 0,
          duration: secondWidth / 61,
          ease: 'none',
          repeat: -1,
        });
      }, stage);

      if (!inView) {
        firstTween?.pause();
        secondTween?.pause();
      }
    };

    const resizeObserver = new ResizeObserver(initialize);
    resizeObserver.observe(stage);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      inView = Boolean(entry?.isIntersecting);
      if (inView) initialize();
      if (inView) {
        firstTween?.play();
        secondTween?.play();
      } else {
        firstTween?.pause();
        secondTween?.pause();
      }
    });
    intersectionObserver.observe(stage);

    // Wait for the committed rows and a browser layout pass before measuring the loop distance.
    timer = window.setTimeout(() => {
      frame = window.requestAnimationFrame(() => {
        ready = true;
        initialize();
      });
    }, 50);

    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      context?.revert();
    };
  }, [firstLane.length, secondLane.length]);

  const renderFlags = (lane: readonly string[], clone = false) =>
    lane.map((code, index) => (
      <figure className="flag-gallery-card" key={`${clone ? 'copy-' : ''}${code}-${index}`}>
        <img src={flagUrl(code)} alt="" width={640} height={480} decoding="async" loading="lazy" />
      </figure>
    ));

  return (
    <div className="flag-gallery" ref={stageRef} aria-hidden="true">
      <div className="flag-gallery-lane">
        <div className="flag-gallery-track" ref={firstTrackRef}>
          <div className="flag-gallery-run" ref={firstRunRef}>{renderFlags(firstLane)}</div>
          <div className="flag-gallery-run" aria-hidden="true">{renderFlags(firstLane, true)}</div>
        </div>
      </div>
      <div className="flag-gallery-lane">
        <div className="flag-gallery-track" ref={secondTrackRef}>
          <div className="flag-gallery-run" ref={secondRunRef}>{renderFlags(secondLane)}</div>
          <div className="flag-gallery-run" aria-hidden="true">{renderFlags(secondLane, true)}</div>
        </div>
      </div>
    </div>
  );
}
