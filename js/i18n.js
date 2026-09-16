/**
 * Two-language UI: English (the copy written in index.html) and Danish.
 *
 * Static page text is marked with data-i18n="key" (innerHTML) and
 * data-i18n-aria="key" (aria-label). The English version is captured from the
 * DOM the first time a language is applied, so index.html stays the single
 * source of the English copy; only the Danish text lives here. Strings that
 * the JavaScript builds at runtime (button labels, readouts, chart and 3D
 * labels) are looked up with t(key) in both languages.
 */

export const LANGUAGES = ['en', 'da'];
const STORAGE_KEY = 'milankovitch:lang';

let current = 'en';
const listeners = new Set();
const originals = new Map(); // element -> English innerHTML / aria-label

// ---------- runtime strings (both languages) -------------------------------
const STRINGS = {
  en: {
    'play.orbit': '▶ Orbit a year',
    'play.sweep': '▶ Sweep one cycle',
    'play.timeline': '▶ Play from −800 kyr',
    'play.pause': '❚❚ Pause',
    'ecc.exaggerated': ' (exaggerated)',
    'season.0': 'March equinox',
    'season.1': 'June solstice',
    'season.2': 'September equinox',
    'season.3': 'December solstice',
    'peri.summer': 'northern summer',
    'peri.autumn': 'northern autumn',
    'peri.winter': 'northern winter',
    'peri.spring': 'northern spring',
    'ice.none': 'none',
    'time.now': 'now',
    'chart.stage': 'stage',
    'chart.mis': 'MIS',
    'chart.future': 'future',
    'stage.interglacial': 'interglacial',
    'stage.glacial': 'glacial',
    'stage.mixed': 'glacials and interglacials',
    'stage.both': 'both',
    'stage.warm': 'warm',
    'stage.cold': 'cold',
    'stage.future': 'Future',
    'stage.futureNote': 'no name yet · the orbit stays round for another ~50 kyr',
    'stage.holocene.name': 'Holocene',
    'stage.holocene.short': 'Hol.',
    'stage.holocene.note': 'The current interglacial: farming, cities, and us.',
    'stage.weichselian.name': 'Weichselian',
    'stage.weichselian.short': 'Weichsel',
    'stage.weichselian.note': 'The last ice age. Ice reached its greatest extent about 21 kyr ago.',
    'stage.eemian.name': 'Eemian',
    'stage.eemian.short': 'Eem',
    'stage.eemian.note': 'Last interglacial, a little warmer than today; hippos in the Thames and Rhine.',
    'stage.saalian.name': 'Saalian complex',
    'stage.saalian.short': 'Saale',
    'stage.saalian.note': 'Three cold stages (MIS 10, 8, 6) with warm interludes in MIS 9 and 7. The Drenthe and Warthe ice advances in MIS 6 were the largest.',
    'stage.holsteinian.name': 'Holsteinian',
    'stage.holsteinian.short': 'Holstein',
    'stage.holsteinian.note': 'A long, mild interglacial during a nearly circular orbit, much like the Holocene.',
    'stage.elsterian.name': 'Elsterian',
    'stage.elsterian.short': 'Elster',
    'stage.elsterian.note': 'One of the most extensive glaciations; ice reached the southern North Sea and cut the Strait of Dover.',
    'stage.cromerian.name': 'Cromerian complex',
    'stage.cromerian.short': 'Cromerian',
    'stage.cromerian.note': 'Four interglacials (Cromerian I–IV) and three glacials (A, B, C); the Don glaciation in MIS 16 was the largest.',
    'chart.unit': 'kyr',
    'chart.e': 'Eccentricity',
    'chart.eps': 'Obliquity (tilt)',
    'chart.prec': 'Precession index e·sin ϖ',
    'chart.q65': '65°N midsummer sunlight',
    'chart.albedo': 'Effective albedo (model)',
    'chart.dT': 'Surface temperature vs today (Stefan–Boltzmann, Planck only)',
    'scene.sun': 'Sun',
    'scene.perihelion': 'Perihelion',
    'scene.aphelion': 'Aphelion',
    'scene.equator': 'Equator',
    'scene.tropic': 'Tropic of Cancer',
    'scene.arctic': 'Arctic Circle',
    'scene.iceEdge': 'Ice edge',
    'scene.iceFree': 'Ice-free pole',
    'scene.sunlight': 'sunlight →',
    'scene.perpendicular': 'perpendicular to orbit',
    'scene.sunPerihelion': 'Sun · Earth at perihelion',
    'scene.midsummerSun': 'midsummer sun →',
    'lang.label': 'Language',
  },
  da: {
    'play.orbit': '▶ Gennemløb et år',
    'play.sweep': '▶ Gennemløb én cyklus',
    'play.timeline': '▶ Afspil fra −800.000 år',
    'play.pause': '❚❚ Pause',
    'ecc.exaggerated': ' (overdrevet)',
    'season.0': 'Forårsjævndøgn',
    'season.1': 'Sommersolhverv',
    'season.2': 'Efterårsjævndøgn',
    'season.3': 'Vintersolhverv',
    'peri.summer': 'nordlig sommer',
    'peri.autumn': 'nordligt efterår',
    'peri.winter': 'nordlig vinter',
    'peri.spring': 'nordligt forår',
    'ice.none': 'ingen',
    'time.now': 'nu',
    'chart.stage': 'periode',
    'chart.mis': 'MIS',
    'chart.future': 'fremtid',
    'stage.interglacial': 'mellemistid',
    'stage.glacial': 'istid',
    'stage.mixed': 'istider og mellemistider',
    'stage.both': 'begge',
    'stage.warm': 'varm',
    'stage.cold': 'kold',
    'stage.future': 'Fremtiden',
    'stage.futureNote': 'intet navn endnu · banen forbliver rund i endnu ~50.000 år',
    'stage.holocene.name': 'Holocæn',
    'stage.holocene.short': 'Hol.',
    'stage.holocene.note': 'Den nuværende mellemistid: landbrug, byer og os.',
    'stage.weichselian.name': 'Weichsel-istiden',
    'stage.weichselian.short': 'Weichsel',
    'stage.weichselian.note': 'Den sidste istid. Isen nåede sin største udbredelse for cirka 21.000 år siden.',
    'stage.eemian.name': 'Eem-mellemistiden',
    'stage.eemian.short': 'Eem',
    'stage.eemian.note': 'Sidste mellemistid, lidt varmere end i dag; flodheste i Themsen og Rhinen.',
    'stage.saalian.name': 'Saale-komplekset',
    'stage.saalian.short': 'Saale',
    'stage.saalian.note': 'Tre kolde perioder (MIS 10, 8, 6) med varme mellemspil i MIS 9 og 7. Drenthe- og Warthe-fremstødene i MIS 6 var de største.',
    'stage.holsteinian.name': 'Holstein-mellemistiden',
    'stage.holsteinian.short': 'Holstein',
    'stage.holsteinian.note': 'En lang, mild mellemistid under en næsten cirkulær bane, meget lig Holocæn.',
    'stage.elsterian.name': 'Elster-istiden',
    'stage.elsterian.short': 'Elster',
    'stage.elsterian.note': 'En af de mest omfattende nedisninger; isen nåede den sydlige Nordsø og skar Doverstrædet.',
    'stage.cromerian.name': 'Cromer-komplekset',
    'stage.cromerian.short': 'Cromer',
    'stage.cromerian.note': 'Fire mellemistider (Cromer I–IV) og tre istider (A, B, C); Don-nedisningen i MIS 16 var den største.',
    'chart.unit': 'tusind år',
    'chart.e': 'Excentricitet',
    'chart.eps': 'Aksehældning',
    'chart.prec': 'Præcessionsindeks e·sin ϖ',
    'chart.q65': 'Midsommersol ved 65°N',
    'chart.albedo': 'Effektiv albedo (model)',
    'chart.dT': 'Overfladetemperatur i forhold til i dag (Stefan–Boltzmann, kun Planck)',
    'scene.sun': 'Solen',
    'scene.perihelion': 'Perihelium',
    'scene.aphelion': 'Aphelium',
    'scene.equator': 'Ækvator',
    'scene.tropic': 'Krebsens vendekreds',
    'scene.arctic': 'Polarcirklen',
    'scene.iceEdge': 'Iskant',
    'scene.iceFree': 'Isfri pol',
    'scene.sunlight': 'sollys →',
    'scene.perpendicular': 'vinkelret på banen',
    'scene.sunPerihelion': 'Solen · Jorden i perihelium',
    'scene.midsummerSun': 'midsommersol →',
    'lang.label': 'Sprog',
  },
};

const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  da: ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'],
};

// ---------- static page text, Danish only (English is read from the DOM) ----
const PAGE = {
  da: {
    'page.title': 'Milankovitch-cyklusser',
    'page.description': 'En interaktiv 3D-forklaring af Milankovitch-cyklusserne: hvordan Jordens strakte bane, nikkende hældning og slingrende akse sætter takten for istiderne, med levende skydere for polaris, albedo og den Stefan–Boltzmann-energibalance, der forvandler albedo til temperatur.',
    'brand': 'Milankovitch<span>cyklusser</span>',
    'nav.label': 'Afsnit',
    'nav.orbit': 'Bane',
    'nav.tilt': 'Hældning',
    'nav.wobble': 'Slingren',
    'nav.timeline': '800.000 år',
    'nav.energy': 'Energi',
    'nav.model': 'Model',
    'lang.label': 'Sprog',

    'hero.eyebrow': 'Orbital påvirkning, gjort synlig',
    'hero.title': 'Milankovitch-cyklusser',
    'hero.lede': 'Jordens bane strækkes, dens akse nikker og slingrer, over titusinder af år. De langsomme rytmer ændrer, hvor meget sommersol der når det høje nord, og det sætter takten for istiderne.',
    'hero.sub': 'Træk i planeten. Vip Jorden. Spol gennem 800.000 år.',
    'hero.ecc': '<b>Excentricitet</b><span>banens form</span><em>~100.000 år</em>',
    'hero.obl': '<b>Aksehældning</b><span>aksens hældning</span><em>~41.000 år</em>',
    'hero.prec': '<b>Præcession</b><span>aksens slingren</span><em>~23.000 år</em>',
    'hero.stage': 'En langsomt roterende 3D-jord oplyst af Solen, med sine polare iskapper',

    'why.title': 'Det afgørende er sommersolen i nord',
    'why.p1': 'Milutin Milanković, der arbejdede i Beograd fra 1920\'erne til 1940\'erne, beregnede i hånden, hvordan disse banecyklusser ændrer det sollys, der når hver breddegrad og årstid. Hans centrale indsigt handlede om, <em>hvor</em> det betyder noget. Iskapperne vokser på de store nordlige kontinenter, så den afgørende størrelse er midsommersolen omkring 65°N. Kølige somre lader vinterens sne overleve; isen breder sig og reflekterer mere sollys; planeten køles yderligere. Varme somre smelter isen tilbage.',
    'why.p2': 'I 1976 fandt Hays, Imbrie og Shackleton netop disse perioder i sedimentkerner fra dybhavet, og cyklusserne gik fra hypotese til »istidernes pacemaker«. Denne side beregner de tre cyklusser ud fra Bergers astronomiske rækker (1978), udregner det resulterende sollys og fører det ind i en bevidst simpel is–albedo-model. Hvert tal på siden er levende.',

    'ecc.eyebrow': 'Excentricitet · ~100.000 og ~400.000 år',
    'ecc.title': 'Hvor strakt er banen?',
    'ecc.lede': 'Jordens bane er en ellipse med Solen i det ene brændpunkt, ikke i centrum. I dag er den næsten cirkulær: Jorden kommer omkring 3 % tættere på Solen i begyndelsen af januar end i begyndelsen af juli, hvilket giver cirka 7 % mere sollys i perihelium. Trukket af Jupiter og Saturn strækkes ellipsen til <span class="mono">e ≈ 0,058</span> og slapper af igen. Excentriciteten ændrer knap nok sollyset over et helt år. Dens egentlige rolle er at styre <em>lydstyrken</em> på præcessionscyklussen nedenfor: en rundere bane dæmper kontrasten mellem årstiderne, en strakt bane forstærker den.',
    'ecc.stage': '3D-visning af Jorden i sin elliptiske bane om Solen. Træk for at rotere.',
    'ecc.e': 'Excentricitet',
    'ecc.hint': '<span class="swatch band"></span>Jordens spænd er 0,000–0,058. Derudover er banen overdrevet for at vise geometrien.',
    'ecc.day': 'Dage efter perihelium',
    'ecc.play': '▶ Gennemløb et år',
    'ecc.playHint': 'Se Jorden sætte farten op nær Solen og sætte den ned langt fra den.',
    'ecc.date': 'Kalenderdato',
    'ecc.dist': 'Afstand til Solen',
    'ecc.rel': 'Sollys i forhold til årsmiddel',
    'ecc.periAph': 'Perihelium → aphelium',
    'ecc.contrast': 'Sollys i perihelium i forhold til aphelium',
    'ecc.stronger': '% stærkere',

    'obl.eyebrow': 'Aksehældning · ~41.000 år',
    'obl.title': 'Hvor meget hælder aksen?',
    'obl.lede': 'Jordens akse hælder 23,4° i forhold til lodret på baneplanet. Den hældning er grunden til, at der er årstider, og den nikker mellem 22,1° og 24,5° cirka hvert 41.000 år. Mere hældning giver stærkere årstider: polerne får mere midsommersol, og polarcirklen kryber mod polen. Mindre hældning giver mildere polarsomre, sne der overlever, og iskapper der kryber mod ækvator. Is reflekterer langt mere sollys end hav eller skov, så voksende is hæver planetens albedo, mindre energi absorberes, og afkølingen nærer sig selv. Hvor meget afkøling? En planet udstråler varme til rummet efter Stefan–Boltzmanns lov, <span class="mono">σT⁴</span>, så den må indstille sig på den temperatur, hvor den varme, den udstråler, er lig med det sollys, den absorberer. Vip Jorden og se isen, albedoen og ligevægtstemperaturen reagere.',
    'obl.stage': '3D-jord med sin rotationsakse, breddecirkler og polare iskapper, oplyst fra højre. Træk for at rotere.',
    'obl.eps': 'Aksehældning',
    'obl.presets': 'Forvalgte hældninger',
    'obl.min': '22,1° minimum',
    'obl.today': '23,4° i dag',
    'obl.max': '24,5° maksimum',
    'obl.hint': '<span class="swatch band"></span>Jordens reelle spænd er 22,1°–24,5°. Skyderen går længere, så du kan se yderpunkterne.',
    'obl.season': 'Årstid',
    'obl.seasonHint': 'Sollyset kommer altid fra højre. Når året skrider frem, svinger den hældende akse mod og væk fra det.',
    'ro.arctic': 'Polarcirklen',
    'ro.q65': 'Midsommersol ved 65°N',
    'ro.iceN': 'Iskant, nord',
    'ro.iceS': 'Iskant, syd',
    'ro.iceFrac': 'Isdække',
    'ro.ofSurface': '% af overfladen',
    'ro.albedo': 'Effektiv albedo',
    'ro.absorbed': 'Absorberet sollys i forhold til i dag',
    'ro.teff': 'Udstrålingstemperatur',
    'ro.dT': 'Overfladetemperatur i forhold til i dag',
    'ro.planckOnly': '°C · Stefan–Boltzmann, kun Planck-respons',
    'obl.note': 'Iskanter og albedo kommer fra sidens simple model, og temperaturerne fra <a href="#energy">energibalancen</a> nedenfor. Begge er beskrevet i <a href="#model">noterne</a>.',

    'prec.eyebrow': 'Præcession · ~19.000–23.000 år',
    'prec.title': 'Hvilken årstid er tættest på Solen?',
    'prec.lede': 'Som en snurretop tegner Jordens akse langsomt en kegle, én gang hvert 26.000 år. Kombineret med ellipsens egen langsomme drejning gentager den klimatiske cyklus sig hvert 19.000–23.000 år. Præcessionen ændrer ikke hældningen, kun hvor aksen peger hen, og dermed hvilken årstid der falder i perihelium. I dag er Jorden tættest på Solen i begyndelsen af januar: de nordlige vintre er lidt mildere, de nordlige somre lidt køligere. For elleve tusind år siden var det omvendt, nordlig sommer i perihelium, midsommersol op til 8 % stærkere, og de sidste store iskapper kollapsede.',
    'prec.stage': '3D-jord i perihelium med aksen fejende rundt i en kegle. Træk for at rotere.',
    'prec.phase': 'Periheliets længde ϖ',
    'prec.play': '▶ Gennemløb én cyklus',
    'prec.playHint': 'Cirka 23.000 år på få sekunder.',
    'prec.date': 'Jorden nærmest Solen den',
    'prec.season': 'Årstid i perihelium',
    'prec.dist': 'Afstand ved nordlig midsommer',
    'prec.index': 'Præcessionsindeks e·sin ϖ',
    'prec.iceN': 'Iskant, nord (model)',
    'prec.note': 'Excentriciteten holdes på dagens 0,017. Med <span class="mono">e = 0,05</span> ville det samme gennemløb flytte midsommersolen ved 65°N tre gange så meget.',

    'time.eyebrow': 'Alle tre sammen',
    'time.title': '800.000 år på én skyder',
    'time.lede': 'Excentriciteten sætter taktens lydstyrke, aksehældning og præcession sætter dens rytme. Her beregnes alle tre sammen ud fra Bergers rækker (1978). Jorden vises ved nordlig midsommer med de iskapper, modellen giver for det øjeblik, og Solens glød skalerer med, hvor tæt Jorden er på den. Træk i tidsskyderen, eller spol direkte på diagrammet.',
    'time.stage': '3D-jord ved nordlig midsommer med modellerede iskapper. Træk for at rotere.',
    'time.t': 'Tid',
    'time.play': '▶ Afspil fra −800.000 år',
    'time.today': 'I dag',
    'time.moments': 'Tidspunkter',
    'time.lgm': 'Weichsel-maksimum −21.000 år',
    'time.holocene': 'Holocæn begynder −11.700 år',
    'time.eemian': 'Eem-mellemistiden −125.000 år',
    'time.saalian': 'Saale-maksimum −155.000 år',
    'time.mis11': 'Holstein-mellemistiden −405.000 år',
    'time.elsterian': 'Elster-istiden −450.000 år',
    'time.next': 'Om ~50.000 år',
    'ro.stage': 'Istidsperiode',
    'ro.e': 'Excentricitet',
    'ro.eps': 'Aksehældning',
    'ro.prec': 'Præcessionsindeks',
    'time.chart': 'Tidsserier for excentricitet, aksehældning, præcessionsindeks, midsommersol ved 65°N, modelleret albedo og den resulterende Stefan–Boltzmann-ændring i overfladetemperatur fra 800.000 år siden til 100.000 år frem. Langs toppen de navngivne istider i Nordeuropa og de marine isotoptrin, varme i guld og kolde i blåt. Træk for at spole i tiden; brug piletasterne til at gå trinvist.',
    'time.chartHint': 'De to bånd langs toppen er istiderne. Den øverste række bærer de nordeuropæiske navne (Weichsel, Saale, Elster for istiderne; Holocæn, Eem, Holstein for mellemistiderne; Cromer-komplekset rummer flere af hver), den nederste de nummererede marine isotoptrin (MIS) aflæst i dybhavssedimenter, ulige numre varme i guld, lige numre kolde i blåt, med grænser fra LR04-stakken. De kolde trin er skraveret ned gennem panelerne. Læg mærke til, hvordan de varme perioder falder sammen med stærk midsommersol, og hvor stille solkurven bliver, når banen er rund (lav excentricitet, omkring −400.000 år og i dag). Nederste panel er den temperatur, Stefan–Boltzmann-balancen tildeler den modellerede albedo, kun Planck-respons; se <a href="#energy">nedenfor</a>.',
    'time.stagesCaption': 'De navngivne istider i de seneste 800.000 år, og hvad de kaldes andre steder',
    'time.th.europe': 'Nordeuropa',
    'time.th.type': 'Type',
    'time.th.mis': 'MIS',
    'time.th.age': 'Tusind år siden',
    'time.th.alps': 'Alperne',
    'time.th.britain': 'Storbritannien',
    'time.th.america': 'Nordamerika',
    'time.th.notes': 'Noter',
    'time.stagesHint': 'Periodernes navne kommer fra de typelokaliteter, hvor aflejringerne først blev beskrevet: floderne Weichsel (Wisła), Saale og Elster, byerne Eem og Holstein samt Cromer på Norfolks kyst. Grænsealdrene følger Lisiecki &amp; Raymo (2005); de landbaserede perioder falder ikke altid præcis sammen med de marine, og Saale og Cromer er komplekser, der hver rummer mere end én kold og varm periode.',

    'en.eyebrow': 'Fra albedo til temperatur',
    'en.title': 'Hvorfor nogle få procent reflekteret lys betyder noget',
    'en.lede': 'Hver kvadratmeter af Jorden modtager, i gennemsnit over året og hele kloden, en fjerdedel af solarkonstanten: cirka 340 W/m². En brøkdel <span class="mono">α</span>, den planetare albedo, kastes direkte tilbage til rummet. Resten absorberes og opvarmer planeten, og en varm planet udstråler varme. Stefan–Boltzmanns lov siger, at et legeme med temperaturen <span class="mono">T</span> udstråler <span class="mono">σT⁴</span>, så Jorden indstiller sig dér, hvor de to er lige store: <span class="mono">(S/4)(1 − α) = σT⁴</span>. Det giver en udstrålingstemperatur på cirka −18 °C, hvilket er det, en satellit ser. Overfladen, ved cirka 15 °C, er 33 grader varmere, fordi drivhusgasser opfanger en del af den udgående infrarøde stråling. Selve loven kræver absolut temperatur, så ligningen løses i kelvin, og resultaterne vises i grader celsius. Flyt albedoen og følg budgettet hele vejen til temperaturen. Isen fra hældningslaboratoriet og tidslinjen lander i den samme ligning.',
    'en.equation': 'Energibalanceligning med levende tal',
    'en.budget': 'Søjler, der viser indkommende sollys delt i en reflekteret og en absorberet del, og den lige så store mængde udstrålet til rummet',
    'en.in': 'Sollys ind <small>S / 4</small>',
    'en.ref': 'Reflekteret <small>α · S / 4</small>',
    'en.abs': 'Absorberet <small>(1 − α) · S / 4</small>',
    'en.out': 'Udstrålet <small>σ T<sub>e</sub><sup>4</sup></small>',
    'en.budgetHint': 'I balance er den absorberede søjle og den udstrålede søjle altid lige lange. Albedoen afgør, hvor meget sollys der skal udstråles igen, og fjerderoden i Stefan–Boltzmann afgør, hvor varm planeten skal være for at gøre det.',
    'en.alb': 'Planetar albedo α',
    'en.presets': 'Forvalgte albedoer',
    'en.today': 'I dag',
    'en.noIce': 'Ingen polaris 0,27',
    'en.iceAge': 'Modellens istid 0,31',
    'en.fromTilt': 'Fra hældningslab',
    'en.fromTimeline': 'Fra tidslinjen',
    'en.hint': '<span class="swatch band"></span>Sidens is–albedo-model holder sig mellem 0,27 og 0,31. Den virkelige Jord ligger i dag på cirka 0,29–0,30; en fuldt nedisiet »snebold« ville ligge over 0,6.',
    'en.incoming': 'Sollys ind, S/4',
    'en.absorbed': 'Absorberet = udstrålet',
    'en.dabs': 'Absorberet i forhold til i dag',
    'en.teff': 'Udstrålingstemperatur T<sub>e</sub>',
    'en.tsurf': 'Overfladetemperatur',
    'en.dt': 'Overflade i forhold til i dag',
    'en.sens': 'Planck-respons dT / dF',
    'en.sensUnit': '°C pr. W/m² · fra T / 4F, ingen feedbacks',
    'en.note': 'Overfladetemperaturen bruger en grå atmosfære kalibreret til 15,0 °C i dag, så den bærer den samme drivhusforskydning på 33 grader ved enhver albedo. Kun Planck-responsen er medtaget; vanddamp- og sky-feedbacks fordobler eller tredobler den groft sagt, og de virkelige istider havde desuden meget lavere CO₂.',

    'model.title': 'Hvad tallene er, og hvad de ikke er',
    'model.elements': '<b>Baneelementer.</b> Excentricitet, aksehældning og periheliets længde beregnes ud fra de trigonometriske rækker i A. Berger, <i>Long-term variations of daily insolation and Quaternary climatic changes</i>, J. Atmos. Sci. 35 (1978), afkortet til de førende led. Over den seneste million år holder de afkortede rækker sig inden for få procent af den fulde løsning; til præcist arbejde brug Laskar et al. (2004).',
    'model.sunlight': '<b>Sollys.</b> Døgnmiddel-indstrålingen ved toppen af atmosfæren bruger standardformlen med en solarkonstant på 1361 W/m². »Midsommersol ved 65°N« er døgnmidlet ved sommersolhverv, den klassiske Milankovitch-diagnostik.',
    'model.ice': '<b>Iskanter.</b> En legetøjsmodel: den ækvatorvendte kant af hver polar iskappe flytter sig lineært med den halvkugles midsommersol (0,34 breddegrad pr. W/m² i nord, mindre i syd, som er forankret af Antarktis), med udgangspunkt i 70°N og 66°S i dag. Virkelige iskapper bruger tusinder af år på at reagere og afhænger af land, hav og CO₂; siden viser ligevægtstendensen, ikke historien.',
    'model.albedo': '<b>Effektiv albedo.</b> Isdækkede breddegrader reflekterer 66 % af sollyset, alt andet 27 %. Den planetare værdi er gennemsnittet vægtet med hver breddegrads årlige sollys, så is nær polerne tæller mindre, end den ville efter areal, og en større hældning, som gør polerne lysere, får polaris til at betyde mere. »Absorberet sollys i forhold til i dag« er den resulterende ændring i den globale middelværdi af absorberet soleffekt; til sammenligning tilføjer en fordobling af CO₂ cirka 4 W/m².',
    'model.energy': '<b>Energibalance og temperatur.</b> Det globale årsmiddel af sollys ved toppen af atmosfæren er <span class="mono">S/(4√(1 − e²))</span>, cirka 340 W/m². Stefan–Boltzmanns lov, udstrålet effekt <span class="mono">σT⁴</span> med <span class="mono">σ = 5,67 × 10⁻⁸ W m⁻² K⁻⁴</span>, fastlægger udstrålingstemperaturen til <span class="mono">T<sub>e</sub> = [S(1 − α)/4σ]<sup>¼</sup></span> ≈ 255 K, eller cirka −18 °C. Overfladetemperaturen bruger en grå atmosfære, <span class="mono">(S/4)(1 − α) = εσT<sub>s</sub>⁴</span>, med den effektive emissivitet <span class="mono">ε ≈ 0,62</span> valgt, så dagens albedo giver 288,15 K, altså 15,0 °C. Loven kræver absolut temperatur, så regnestykket udføres i kelvin; siden viser grader celsius, og en forskel er det samme tal i begge enheder. Differentiation giver Planck-responsen <span class="mono">dT<sub>s</sub>/dF = T<sub>s</sub>/4F</span> ≈ 0,30 °C pr. W/m²: en stigning i albedo på 0,01 fjerner cirka 3,4 W/m² og køler overfladen cirka 1 °C, før nogen feedback. Vanddamp, skyer og temperaturgradient fordobler eller tredobler groft sagt det i det virkelige klima, og istidernes afkøling på 5–6 °C krævede langt større iskapper og lavere CO₂, end dette legetøj har.',
    'model.not': '<b>Ikke en klimamodel.</b> Der er intet hav, intet kulstofkredsløb, ingen isdynamik og ingen forsinkelse. Milankovitch-påvirkningen er pacemakeren; feedbacks forvandler dens svage takt til istider.',
    'model.sources': 'Videre læsning: Lisiecki &amp; Raymo, <i>A Pliocene–Pleistocene stack of 57 globally distributed benthic δ¹⁸O records</i>, Paleoceanography (2005) · Hays, Imbrie &amp; Shackleton, <i>Variations in the Earth\'s Orbit: Pacemaker of the Ice Ages</i>, Science (1976) · Laskar et al., <i>A long-term numerical solution for the insolation quantities of the Earth</i>, A&amp;A (2004) · M. Milanković, <i>Kanon der Erdbestrahlung</i> (1941).',

    'foot': 'Bygget med three.js. Astronomiske rækker efter Berger (1978). Jordens kort er proceduralt genereret.',
    'webgl': 'Siden kræver WebGL og en moderne browser til 3D-scenerne. Forklaringerne og tallene virker stadig.',
  },
};

// ---------- public API -------------------------------------------------------
export function lang() { return current; }

/** Runtime string lookup. Falls back to English, then to the key itself. */
export function t(key) {
  return STRINGS[current]?.[key] ?? STRINGS.en[key] ?? key;
}

/** Localise the decimal separator in an already formatted string. */
export function n(s) {
  s = String(s);
  return current === 'da' ? s.replace(/(\d)\.(\d)/g, '$1,$2') : s;
}

/** Day-of-year parts to a short calendar date, e.g. "3 Jan" / "3. jan." */
export function formatDate({ day, month }) {
  const m = MONTHS[current]?.[month] ?? MONTHS.en[month];
  return current === 'da' ? `${day}. ${m}` : `${day} ${m}`;
}

/** Time relative to now, in kyr, as a readout label. */
export function formatKyr(t) {
  if (Math.abs(t) < 0.25) return t_('time.now');
  if (current === 'da') {
    const years = String(Math.round(Math.abs(t) * 1000)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return t < 0 ? `for ${years} år siden` : `om ${years} år`;
  }
  return `${Math.abs(t).toFixed(1)} kyr ${t < 0 ? 'ago' : 'ahead'}`;
}
const t_ = t;

export function onLanguageChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setLanguage(next, { persist = true } = {}) {
  if (!LANGUAGES.includes(next)) next = 'en';
  current = next;
  applyToPage();
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* private mode etc. */ }
    try {
      const url = new URL(location.href);
      if (next === 'en') url.searchParams.delete('lang'); else url.searchParams.set('lang', next);
      history.replaceState(null, '', url);
    } catch { /* ignore */ }
  }
  listeners.forEach((fn) => fn(next));
}

/** Pick the initial language: ?lang= → saved choice → browser language → English. */
export function initLanguage() {
  let pick = null;
  try { pick = new URLSearchParams(location.search).get('lang'); } catch { /* ignore */ }
  if (!LANGUAGES.includes(pick)) {
    try { pick = localStorage.getItem(STORAGE_KEY); } catch { pick = null; }
  }
  if (!LANGUAGES.includes(pick)) {
    const nav = (navigator.languages || [navigator.language || '']).map((l) => String(l).toLowerCase());
    pick = nav.some((l) => l.startsWith('da')) ? 'da' : 'en';
  }
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setLanguage(b.dataset.lang)));
  setLanguage(pick, { persist: false });
}

// ---------- DOM application -------------------------------------------------
function applyToPage() {
  const page = PAGE[current] || {};
  document.documentElement.lang = current;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    const isText = el.tagName === 'TITLE';
    if (!originals.has(el)) originals.set(el, isText ? el.textContent : el.innerHTML);
    const value = page[key] ?? originals.get(el);
    if (isText) el.textContent = value; else el.innerHTML = value;
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.dataset.i18nAria;
    if (!originals.has(el)) originals.set(el, el.getAttribute('aria-label') || '');
    el.setAttribute('aria-label', page[key] ?? originals.get(el));
  });
  const meta = document.querySelector('meta[name="description"]');
  if (meta) {
    if (!originals.has(meta)) originals.set(meta, meta.getAttribute('content') || '');
    meta.setAttribute('content', page['page.description'] ?? originals.get(meta));
  }
  document.querySelectorAll('[data-lang]').forEach((b) => {
    const active = b.dataset.lang === current;
    b.setAttribute('aria-pressed', String(active));
    b.classList.toggle('is-active', active);
  });
}
