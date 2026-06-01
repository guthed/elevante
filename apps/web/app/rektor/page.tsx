import type { Metadata } from 'next';
import Image from 'next/image';
import DeckStage from './DeckStage';

import shotChat from '../../public/rektor/shot-chat-kallor.png';
import shotElev from '../../public/rektor/shot-elev-oversikt.png';
import shotKarta from '../../public/rektor/shot-forstaelsekarta.png';

export const metadata: Metadata = {
  title: 'Elevante — Rektorspresentation',
  description: 'Elevante minns allt du lär dig i skolan. En presentation för dig som rektor.',
  robots: { index: false, follow: false },
};

export default function RektorPage() {
  return (
    <DeckStage>
      {/* 01 — TITLE */}
      <section className="s-title" data-label="Elevante">
        <div className="frame">
          <p className="eyebrow">För dig som rektor</p>
          <div className="spacer" style={{ flex: '0 0 30px' }} />
          <h1 className="wordmark">
            Elevante<span className="dot">.</span>
          </h1>
          <p className="tagline">Elevante minns allt du lär dig i skolan.</p>
          <p className="title-intro">
            Varje dag hålls genomtänkta lektioner — som försvinner i samma stund som det ringer ut.
            En elev är borta, en annan hänger inte med, en tredje vågar inte fråga — och det finns
            ingen backup som faktiskt var med i klassrummet. Vi byggde Elevante för att varje elev
            ska kunna gå tillbaka till lektionen som hölls, inte till ett generellt svar från nätet.
          </p>
        </div>
        <div className="brandfoot">elevante.se</div>
      </section>

      {/* 02 — PROBLEMET */}
      <section data-label="Problemet">
        <div className="frame">
          <div className="header">
            <p className="eyebrow">Problemet</p>
            <h2 className="title">Tre elever, samma behov</h2>
          </div>
          <div className="spacer" style={{ flex: '0 0 56px' }} />
          <div className="cols-3">
            <div className="card persona">
              <span className="tag">Var sjuk</span>
              <p className="who">Eleven som missade veckan</p>
              <p className="desc">Vill ta igen genomgången — men den finns inte kvar någonstans att gå tillbaka till.</p>
            </div>
            <div className="card persona">
              <span className="tag">Hänger inte med</span>
              <p className="who">Eleven som tappar tempot</p>
              <p className="desc">Skulle behöva höra begreppet en gång till — i sin egen takt.</p>
            </div>
            <div className="card persona">
              <span className="tag">Pluggar inför provet</span>
              <p className="who">Eleven kvällen innan</p>
              <p className="desc">Sitter med anteckningar som inte riktigt räcker hela vägen.</p>
            </div>
          </div>
          <div className="spacer" />
          <p className="lead" style={{ maxWidth: '42ch' }}>
            Idag googlar de — eller frågar ChatGPT — och får svar som inte har <em>någonting</em> att
            göra med vad som faktiskt sas på lektionen.
          </p>
        </div>
        <div className="pagefoot">02</div>
      </section>

      {/* 03 — LÖSNINGEN */}
      <section data-label="Lösningen">
        <div className="frame">
          <div className="header">
            <p className="eyebrow">Lösningen</p>
          </div>
          <div className="spacer" style={{ flex: '0 0 36px' }} />
          <div
            className="cols-2"
            style={{ gridTemplateColumns: '1fr 1.05fr', gap: '84px', alignItems: 'center', flex: 1 }}
          >
            <div>
              <p className="statement" style={{ fontSize: '58px', maxWidth: '18ch' }}>
                Spelar in, transkriberar <em>på svenska</em> — och svarar på elevens frågor.
              </p>
              <p className="body" style={{ marginTop: '32px', maxWidth: '40ch' }}>
                Svaren är grundade i lektionen som faktiskt hölls, med citat ur genomgången —
                eleven möter er undervisning, inte internets.
              </p>
            </div>
            <div className="shot-frame">
              <Image
                className="shot"
                src={shotChat}
                alt="Elevante-chatt med svar och källhänvisningar ur lektionen"
                sizes="50vw"
                placeholder="blur"
                priority
              />
              <p className="shot-cap">Fråga Elevante · svar med källor</p>
            </div>
          </div>
        </div>
        <div className="pagefoot">03</div>
      </section>

      {/* 04 — SÅ FUNKAR DET */}
      <section data-label="Så funkar det">
        <div className="frame">
          <div className="header">
            <p className="eyebrow">Så funkar det</p>
            <h2 className="title">Tre steg, inget krångel</h2>
          </div>
          <div className="spacer" style={{ flex: '0 0 64px' }} />
          <div className="cols-3">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div className="step-num">01</div>
              <h3 className="step-h">Läraren trycker REC</h3>
              <p className="small" style={{ maxWidth: '26ch' }}>
                Schemat vet resten — vilken klass, vilken kurs, vilken lektion. Max två tryck.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div className="step-num">02</div>
              <h3 className="step-h">Vi transkriberar</h3>
              <p className="small" style={{ maxWidth: '26ch' }}>
                Genomgången blir text på svenska. Råljudet raderas direkt efteråt.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div className="step-num">03</div>
              <h3 className="step-h">Eleven frågar</h3>
              <p className="small" style={{ maxWidth: '26ch' }}>
                I sin egen takt — och får svar med citat ur den egna lektionen.
              </p>
            </div>
          </div>
        </div>
        <div className="pagefoot">04</div>
      </section>

      {/* 05 — INTE CHATGPT */}
      <section data-label="Inte ChatGPT">
        <div className="frame">
          <div className="header">
            <p className="eyebrow">Det här är inte ChatGPT</p>
            <h2 className="title">Bunden till er undervisning</h2>
          </div>
          <div className="spacer" style={{ flex: '0 0 52px' }} />
          <div className="contrast" style={{ maxWidth: '52ch' }}>
            <div className="crow">
              <div className="ck">✓</div>
              <div>
                <h4>Kan inte hitta på</h4>
                <p>
                  Strikt RAG<sup className="fn">*</sup> — modellen svarar bara utifrån det som
                  faktiskt sades på lektionen.
                </p>
              </div>
            </div>
            <div className="crow">
              <div className="ck">✓</div>
              <div>
                <h4>Visar alltid källan</h4>
                <p>Varje svar pekar tillbaka till stället i genomgången där det kom ifrån.</p>
              </div>
            </div>
            <div className="crow">
              <div className="ck">✓</div>
              <div>
                <h4>Förstärker läraren — ersätter den inte</h4>
                <p>Svaren bygger på lärarens egen genomgång. Eleven möter er undervisning, inte en generisk källa — lärarens tolkningsföreträde är kvar.</p>
              </div>
            </div>
          </div>
          <div className="spacer" />
          <p className="footnote">
            <span className="fn-mark">*</span> RAG (Retrieval-Augmented Generation) innebär att
            modellen först hämtar relevanta avsnitt ur er egen lektion och sedan formulerar svaret
            utifrån dem. Den kan därför inte hitta på fritt — svaret är alltid bundet till källan.
          </p>
        </div>
        <div className="pagefoot">05</div>
      </section>

      {/* 06 — FÖR LÄRAREN */}
      <section className="s-statement" data-label="För läraren">
        <div className="frame">
          <p className="eyebrow">För läraren</p>
          <div className="spacer" style={{ flex: '0 0 40px' }} />
          <p className="statement">
            Läraren äger lektionen. <em>Elevante minns den.</em>
          </p>
          <div className="spacer" style={{ flex: '0 0 44px' }} />
          <p className="body" style={{ maxWidth: '46ch' }}>
            Inget för- eller efterarbete, max två tryck. Elevante förstärker undervisningen —
            det ersätter aldrig läraren. Byggt med läraren, inte runt.
          </p>
        </div>
        <div className="pagefoot">06</div>
      </section>

      {/* 07 — FÖR ELEVEN */}
      <section data-label="För eleven">
        <div className="frame">
          <div className="header">
            <p className="eyebrow">För eleven</p>
            <h2 className="title">Samma lektion, fler chanser</h2>
          </div>
          <div
            className="cols-2"
            style={{
              gridTemplateColumns: '1fr 1.12fr',
              gap: '80px',
              alignItems: 'center',
              flex: 1,
              marginTop: '28px',
            }}
          >
            <div className="blist" style={{ maxWidth: '36ch', gap: '26px' }}>
              <div className="bitem">
                <div className="bmark" />
                <div>
                  <h4>Likvärdig tillgång</h4>
                  <p>Varje elev kommer åt varje lektion — oavsett om de var där eller inte.</p>
                </div>
              </div>
              <div className="bitem">
                <div className="bmark" />
                <div>
                  <h4>Repetition i egen takt</h4>
                  <p>Gå tillbaka, fråga om, ta begreppet en gång till. Utan att hålla upp klassen.</p>
                </div>
              </div>
              <div className="bitem">
                <div className="bmark" style={{ background: 'var(--coral)' }} />
                <div>
                  <h4>Stöd som gör skillnad</h4>
                  <p>
                    Särskilt värdefullt för elever med NPF eller dyslexi — och för nyanlända och SVA,
                    där text att läsa i lugn takt sänker tröskeln in i ämnet.
                  </p>
                </div>
              </div>
            </div>
            <div className="shot-frame">
              <Image
                className="shot"
                src={shotElev}
                alt="Elevens översikt i Elevante med dagens lektioner och senaste chatt"
                sizes="50vw"
                placeholder="blur"
                priority
              />
              <p className="shot-cap">Elevens vy · dagens lektioner</p>
            </div>
          </div>
        </div>
        <div className="pagefoot">07</div>
      </section>

      {/* 08 — FÖR REKTOR */}
      <section data-label="För dig som rektor">
        <div className="frame">
          <div className="header">
            <p className="eyebrow">För dig som rektor</p>
            <h2 className="title">En levande förståelsekarta</h2>
          </div>
          <div
            className="cols-2"
            style={{
              gridTemplateColumns: '0.82fr 1.4fr',
              gap: '72px',
              alignItems: 'center',
              flex: 1,
              marginTop: '30px',
            }}
          >
            <p className="body" style={{ maxWidth: '30ch' }}>
              Du ser vilka koncept eleverna faktiskt kämpar med — klass för klass, medan terminen
              pågår. Underlag för pedagogiskt ledarskap medan ni fortfarande kan påverka — inte
              först när terminen är slut.
            </p>
            <div className="shot-frame">
              <Image
                className="shot"
                src={shotKarta}
                alt="Förståelsekarta i Elevante som visar vilka koncept varje elev frågat om"
                sizes="60vw"
                placeholder="blur"
                priority
              />
              <p className="shot-cap">Förståelsekarta · per klass och koncept</p>
            </div>
          </div>
        </div>
        <div className="pagefoot">08</div>
      </section>

      {/* 09 — HELA SKOLAN */}
      <section data-label="Hela skolan">
        <div className="frame">
          <div className="header">
            <p className="eyebrow">Inte bara eleven</p>
            <h2 className="title">Vi lyfter hela skolan, inte bara den enskilda eleven</h2>
          </div>
          <div className="spacer" style={{ flex: '0 0 60px' }} />
          <div className="cols-2" style={{ gap: '80px', alignItems: 'start' }}>
            <div className="feat">
              <h3 className="step-h" style={{ fontSize: '36px' }}>
                En gemensam grund
              </h3>
              <p className="body" style={{ maxWidth: '38ch' }}>
                När varje genomgång finns kvar bygger ni en gemensam kunskapsbank som håller —
                oavsett frånvaro, vikarier och tempo. En kvalitetssäkrad grund som hela skolan kan
                vila på.
              </p>
            </div>
            <div className="feat">
              <h3 className="step-h" style={{ fontSize: '36px' }}>
                Lärartid som räcker till fler
              </h3>
              <p className="body" style={{ maxWidth: '38ch' }}>
                Vissa frågor återkommer om och om igen. Elevante ger varje elev en tålmodig första
                instans — så att lärarens tid räcker till det som verkligen kräver en lärare.
              </p>
            </div>
          </div>
        </div>
        <div className="pagefoot">09</div>
      </section>

      {/* 10 — PERSONUPPGIFTER */}
      <section data-label="Personuppgifter">
        <div className="frame">
          <div className="header">
            <p className="eyebrow">Tryggt med personuppgifter</p>
            <h2 className="title">Byggt för svensk skola</h2>
          </div>
          <div className="spacer" style={{ flex: '0 0 56px' }} />
          <div className="trust">
            <div className="ti">
              <div className="tnum">01</div>
              <div>
                <h4>All data inom EU</h4>
                <p>All databehandling sker inom EU — inget skickas utanför.</p>
              </div>
            </div>
            <div className="ti">
              <div className="tnum">02</div>
              <div>
                <h4>Svensk transkribering</h4>
                <p>KB-Whisper via Berget AI — byggt för svenska, kört i Sverige.</p>
              </div>
            </div>
            <div className="ti">
              <div className="tnum">03</div>
              <div>
                <h4>Råljudet raderas</h4>
                <p>Ljudet tas bort så snart transkriberingen är klar. Bara texten finns kvar.</p>
              </div>
            </div>
            <div className="ti">
              <div className="tnum">04</div>
              <div>
                <h4>PUB-avtal — ni äger datan</h4>
                <p>Personuppgiftsbiträdesavtal på plats. Skolan äger sin data.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="pagefoot">10</div>
      </section>

      {/* 11 — MÄTER I PILOTEN */}
      <section data-label="Det här mäter vi">
        <div className="frame">
          <div className="header">
            <p className="eyebrow">Det här mäter vi i piloten</p>
            <h2 className="title">Så vet vi att det funkar</h2>
          </div>
          <p className="body" style={{ marginTop: '22px', maxWidth: '50ch' }}>
            Piloten är inte en magkänsla. Vi följer fyra konkreta mått — och stämmer av med dig efter
            en månad.
          </p>
          <div className="spacer" style={{ flex: '0 0 44px' }} />
          <div className="cols-2" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '30px 56px' }}>
            <div className="metric-row">
              <span className="mi">01</span>
              <h3 className="mh">Användning per elev</h3>
              <p className="mp">
                Hur många elever som faktiskt återvänder, hur ofta och inför vad — så vi ser om
                verktyget blir en vana eller bara provas en gång.
              </p>
            </div>
            <div className="metric-row">
              <span className="mi">02</span>
              <h3 className="mh">Vilka koncept som repeteras mest</h3>
              <p className="mp">
                Vilka begrepp eleverna gång på gång går tillbaka till. Det pekar ut var i kursen
                lärandet behöver mest stöd — i klartext, klass för klass.
              </p>
            </div>
            <div className="metric-row">
              <span className="mi">03</span>
              <h3 className="mh">Lärarnas upplevda tidsvinst</h3>
              <p className="mp">
                Hur mycket repetitionsfrågor och omtagningar som lyfts av läraren. Vi frågar lärarna
                direkt — kändes det som mindre friktion i vardagen?
              </p>
            </div>
            <div className="metric-row">
              <span className="mi">04</span>
              <h3 className="mh">Elevernas upplevelse</h3>
              <p className="mp">
                Om eleverna känner att de förstår stoffet bättre och vågar fråga mer. Tryggheten i
                att kunna ta lektionen en gång till, i egen takt.
              </p>
            </div>
          </div>
        </div>
        <div className="pagefoot">11</div>
      </section>

      {/* 12 — KOM IGÅNG */}
      <section data-label="Kom igång">
        <div className="frame">
          <p className="eyebrow">Kom igång</p>
          <div
            className="cols-2"
            style={{ gridTemplateColumns: '1.05fr 1fr', gap: '80px', alignItems: 'center', flex: 1 }}
          >
            <div>
              <h2 className="title" style={{ fontSize: '84px', maxWidth: '16ch' }}>
                Börja i det lilla<span style={{ color: 'var(--coral)' }}>.</span>
              </h2>
              <p className="body" style={{ marginTop: '28px', maxWidth: '34ch' }}>
                Starta en kostnadsfri pilot med en klass, en kurs, en månad — och se vad den gör för
                era elever innan ni bestämmer något mer.
              </p>
              <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p className="pilotline">
                  <b>Gratis pilot</b> · en klass · en kurs · en månad
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '42px', alignItems: 'flex-start' }}>
              <a className="cta" href="mailto:john@elevante.se">
                Boka en demo <span className="arr">→</span>
              </a>
              <div className="contact">
                <b>John Guthed</b>
                <br />
                john@elevante.se
                <br />
                elevante.se
              </div>
            </div>
          </div>
        </div>
        <div className="brandfoot">Elevante</div>
      </section>
    </DeckStage>
  );
}
