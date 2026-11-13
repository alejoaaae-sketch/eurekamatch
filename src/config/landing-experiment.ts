// Presentation-only switch. Does not affect billing, data, domains or app limits.
export const LANDING_EXPERIMENT_ENABLED = true;

export const landingExperimentCopy: Record<string, { title: string; subtitle: string; choose: string }> = {
  es: { title: 'Descubre si le gustas a alguien que te gusta', subtitle: 'Si os elegís mutuamente, os avisamos a ambos. Tus elecciones son privadas hasta que haya match.', choose: '¿Qué conexión buscas?' },
  eu: { title: 'Ezagutu gustuko duzun norbaitek zu ere gustuko zaituen', subtitle: 'Elkar aukeratzen baduzue, bioi jakinaraziko dizuegu. Zure aukerak pribatuak dira bat etortzen zareten arte.', choose: 'Zer lotura bilatzen duzu?' },
  en: { title: 'Find out if someone you like likes you too', subtitle: 'If you choose each other, we notify you both. Your choices stay private until there is a match.', choose: 'What connection are you looking for?' },
  fr: { title: 'Découvrez si vous plaisez à quelqu’un qui vous plaît', subtitle: 'Si vous vous choisissez mutuellement, nous vous prévenons tous les deux. Vos choix restent privés jusqu’au match.', choose: 'Quelle connexion recherchez-vous ?' },
  ca: { title: 'Descobreix si agrades a algú que t’agrada', subtitle: 'Si us trieu mútuament, us avisem a tots dos. Les teves eleccions són privades fins que hi hagi match.', choose: 'Quina connexió busques?' },
  gl: { title: 'Descobre se lle gustas a alguén que che gusta', subtitle: 'Se vos escolledes mutuamente, avisámosvos aos dous. As túas eleccións son privadas ata que haxa match.', choose: 'Que conexión buscas?' },
  pt: { title: 'Descobre se alguém de quem gostas também gosta de ti', subtitle: 'Se se escolherem mutuamente, avisamos os dois. As tuas escolhas são privadas até haver um match.', choose: 'Que ligação procuras?' },
  it: { title: 'Scopri se piaci a qualcuno che ti piace', subtitle: 'Se vi scegliete a vicenda, avvisiamo entrambi. Le tue scelte restano private fino al match.', choose: 'Quale connessione cerchi?' },
  de: { title: 'Finde heraus, ob jemand, den du magst, dich auch mag', subtitle: 'Wenn ihr euch gegenseitig wählt, benachrichtigen wir euch beide. Deine Auswahl bleibt bis zum Match privat.', choose: 'Welche Verbindung suchst du?' },
  ja: { title: '好きな人があなたを好きか、見つけよう', subtitle: 'お互いを選んだら、二人にお知らせします。マッチするまで、あなたの選択は非公開です。', choose: 'どんなつながりを探していますか？' },
};