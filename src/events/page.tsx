import "./page.css";
import "./pageMobile.css";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import ParallaxMotion from '../effects/ParallaxMotion.tsx';
import { Button } from '../components/ui';
import { NavBar } from '../components/layout';

const HEADER_IMG_SRC = "/assets/images/events/join-process.webp";
const LUMA_CALENDAR_URL = "https://luma.com/founders-house_helsinki";
const LUMA_EMBED_SRC = "https://luma.com/embed/calendar/cal-vomyAWNbgYPbFxm/events?lt=dark";

const removeDuplicatePageCssSheets = () => {
  if (typeof document === "undefined") return false;
  const sheets = Array.from(document.styleSheets);
  const pageCssSheets = sheets.filter(sheet =>
    sheet.href && sheet.href.includes("/events/page.css")
  );
  if (pageCssSheets.length <= 1) return false;
  pageCssSheets.slice(1).forEach(sheet => {
    sheet.ownerNode?.remove();
  });
  return true;
};

const forceStyleRecalc = () => {
  if (typeof document === "undefined") return;
  document.body.style.display = "none";
  void document.body.offsetHeight;
  document.body.style.display = "";
};

// Clean up duplicate stylesheets from Vite HMR on component unmount
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (removeDuplicatePageCssSheets()) {
      forceStyleRecalc();
    }
  });
}

export default function EventsPage() {
  const [stage, setStage] = useState(1);
  const [showNavBar, setShowNavBar] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    const matches = window.matchMedia('(max-width: 768px)').matches;
    return matches;
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNavBar(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  //--------------------------------------//
  // Parallax on Elements Settings //
  //--------------------------------------//
  const { scrollY } = useScroll();
  const headerBG = useTransform(scrollY, [0, 1000], [0, 200]);

  // Transition from stage 1 to stage 2 after a delay
  useEffect(() => {
    if (typeof document === "undefined") {
      setFontsReady(true);
      return;
    }

    const fontSet = document.fonts;
    if (!fontSet || fontSet.status === "loaded") {
      setFontsReady(true);
      return;
    }

    let cancelled = false;
    fontSet.ready.then(() => {
      if (!cancelled) setFontsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (stage === 1 && fontsReady) {
      const timer = setTimeout(() => setStage(2), 1000);
      return () => clearTimeout(timer);
    }
  }, [stage, fontsReady]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // Remove duplicate page.css stylesheets on mount (Vite HMR bug)
  useEffect(() => {
    const runCleanup = () => {
      if (removeDuplicatePageCssSheets()) {
        forceStyleRecalc();
      }
    };

    runCleanup();
    const timeout = setTimeout(runCleanup, 50);

    return () => clearTimeout(timeout);
  }, []);



  // The page scrolls vertically (title on top, Luma calendar below).
  // Native scrolling is enabled here so scrolling inside the calendar hands over to the page.
  useEffect(() => {
    document.documentElement.classList.add('events-scroll');
    document.body.classList.add('events-scroll');
    return () => {
      document.documentElement.classList.remove('events-scroll');
      document.body.classList.remove('events-scroll');
    };
  }, []);

  const parallaxScale = isMobile ? 0.5 : 1;

  return (
    <div
      className="events-page"
      style={{ position: "relative", display: "flow-root", maxWidth: "100%", minHeight: "100vh", background: "#2B0906" }}
    >
      <section className="visually-hidden" aria-label="Founders House events">
        <h1>Founders House Events</h1>
        <p>Curated founder events in Helsinki.</p>
        <p>Discover upcoming gatherings and community moments.</p>
      </section>

      <NavBar 
        logoColor="dark" 
        hamburgerColor="#FFF8F2" 
        streakColor="rgba(216, 46, 17, 1)" 
        opacity={showNavBar ? 1 : 0} 
      />


      {/*---------------------------------------------------------------------*/}
      {/* Persistent animated image container */}
      {/*---------------------------------------------------------------------*/}
      <motion.div
        className={`stage1-img-container${stage === 2 ? " is-hero" : ""}`}
        initial={false}
        animate={
          stage === 1
            ? {
                width: "100%",
                height: "100vh",
                overflow: "hidden",
                position: "absolute",
                top: "10vh",
                left: "50%",
                x: "-50%",
                scale: 0.9,
                zIndex: 2
              }
            : {
                width: "100%",
                height: "100vh",
                overflow: "hidden",
                position: "absolute",
                top: "0",
                left: "50%",
                x: "-50%",
                scale: 1,
                zIndex: 2
              }
        }
        transition={{ duration: 1.2, ease: [0.32, 0.26, 0, 1] }}
      >
        <ParallaxMotion speedX={12 * parallaxScale} speedY={12 * parallaxScale} easing={[0.37, 0.67, 0.3, 0.97]} delay={12}>
          <motion.img
            className="stage1-img"
            src={HEADER_IMG_SRC}
            alt="Events"
            initial={false}
            animate={
                stage === 1
                ? { width: "100%", height: "100vh", position: "absolute", objectFit: "cover", filter: "grayscale(1) brightness(0.6)", scale: 1.4 }
                : { width: "100%", height: "100vh", position: "absolute", objectFit: "cover", filter: "grayscale(1) brightness(0.35)", scale: 1.05 }
            }
            transition={{ duration: 2, ease: [0.32, 0.26, 0, 1] }}
            style={{ y: headerBG }}
          />
        </ParallaxMotion>
        <motion.div
          className="stage1-text-overlay"
          initial={false}
          animate={
            stage === 1
            ? { width: "100%", top: 0, objectFit: "cover", scale: 1 }
            : { width: "100%", top: 0, objectFit: "cover", scale: 0.9 }
          }
          transition={{ delay: 0.1, duration: 1.8, ease: [0.22, 0.26, 0, 1] }}
        >
          <div className="stage1-text-overlay-wrapper">
            <motion.h2
              className="stage1-text-overlay-h2"
              initial={{ y: 0 }}
              animate={
                stage === 1
                ? { y: 0 }
                : { y: 0, filter: "blur(20px)", opacity: 0 }
              }
              transition={{ delay: 0.8, duration: 0.8, ease: [0.42, 0.00, 1.00, 1.00] }}
              >
                <span>join us, build with us,</span>
            </motion.h2>
          </div>
          <div className="stage1-text-overlay-wrapper">
            <motion.h2
              className="stage1-text-overlay-h2"
              initial={{ y: 0 }}
              animate={
                stage === 1
                ? { y: 0 }
                : { y: 0, filter: "blur(20px)", opacity: 0 }
              }
              transition={{ delay: 0.8, duration: 0.8, ease: [0.42, 0.00, 1.00, 1.00] }}
              >
                <span>define tomorrow.</span>
            </motion.h2>
          </div>
        </motion.div>
      </motion.div>

      {/*---------------------------------------------------------------------*/}
      {/* Stage 1 content */}
      {/*---------------------------------------------------------------------*/}
      <AnimatePresence>
        {stage === 1 && (
          <motion.div
            className="stage1-wrapper"
            key="stage1"
            initial={{ opacity: 1, y: 15 }}
            exit={{ opacity: 0.5, y: -30 }}
            transition={{ duration: 2, ease: [0.32, 0.26, 0, 1] }}
            style={{ position: "absolute", width: "100%", height: "100vh", zIndex: 1 }}
          >
            <div className="corner-elements">
              <motion.div
                className="corner-element top-left"
                initial={{ left: "20px", opacity: 1 }}>
                  <p>FOUNDERS HOUSE</p>
              </motion.div>
              <motion.div
                className="corner-element top-right"
                initial={{ right: "15px", opacity: 1 }}>
                  <p>HELSINKI, FINLAND</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/*---------------------------------------------------------------------*/}
      {/* Stage 2 content */}
      {/*---------------------------------------------------------------------*/}
      <AnimatePresence>
        {stage === 2 && (
          <motion.div
            key="stage2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ position: "relative", width: "100%", zIndex: 4, pointerEvents: "none" }}
            className="stage2-wrapper"
          >
            <div className="header-wrapper" style={{pointerEvents: "none"}}>
              <div className="header-content">
                <ParallaxMotion speedX={30 * parallaxScale} speedY={15 * parallaxScale} easing={[0.17, 0.67, 0.3, 0.99]} delay={10}>
                  <div className="header-h1-wrapper">
                    <motion.h1
                      className="header-h1"
                      initial={{ y: 122 }}
                      animate={{ y: 0 }}
                      transition={{ delay: 2.4, duration: 1.3, ease: [0.11, 0.45, 0.08, 1.00] }}
                      >
                        EVENTS
                    </motion.h1>
                  </div>
                </ParallaxMotion>
                <div className="header-h3-wrapper">
                  <ParallaxMotion
                    className="header-h3-parallax"
                    speedX={40 * parallaxScale}
                    speedY={25 * parallaxScale}
                    easing={[0.17, 0.67, 0.3, 0.99]}
                  >
                    <div className="header-h3-row">
                      <motion.div
                        className="calendar-button-wrapper"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.6, duration: 1, ease: [0.11, 0.45, 0.08, 1.00] }}
                        style={{ pointerEvents: "auto" }}
                      >
                        <a
                          href={LUMA_CALENDAR_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: 'none' }}
                        >
                          <Button className="calendar-button events-calendar-button">
                            Subscribe Here
                          </Button>
                        </a>
                      </motion.div>
                      <motion.h3
                        className="header-h3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.6, duration: 1, ease: [0.11, 0.45, 0.08, 1.00] }}
                        >
                          We host highly curated events, networking opportunities and community building sessions designed to accelerate your startup journey.
                      </motion.h3>
                    </div>
                  </ParallaxMotion>
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/*---------------------------------------------------------------------*/}
      {/* Luma Events Calendar */}
      {/*---------------------------------------------------------------------*/}
      <AnimatePresence>
        {stage === 2 && (
          <motion.div
            key="calendar"
            className="events-calendar-section"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3, duration: 1.2, ease: [0.11, 0.45, 0.08, 1.00] }}
          >
            <iframe
              className="events-calendar-frame"
              src={LUMA_EMBED_SRC}
              title="Founders House events calendar on Luma"
              allowFullScreen
              tabIndex={0}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
