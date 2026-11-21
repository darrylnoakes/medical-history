// The guided tour: a path down the main channel. Each stop flies to an entry and says why it matters.
export interface TourStop { id: string; zoom?: number; text: string }

export const TOUR: TourStop[] = [
  { id: 'trepanation', zoom: 2.2, text: 'The headwaters. Before writing there are only bones to read — and some skulls show holes cut in life, with bone that had time to heal. Notice how blurred everything is back here: these dates are estimates, and the map draws them that way.' },
  { id: 'edwin-smith-papyrus', zoom: 4, text: 'The first streams with names. In Egypt and Mesopotamia, healing gets written down — spells and prescriptions side by side, and now and then something that reads startlingly like a modern case note.' },
  { id: 'hippocrates', zoom: 6, text: 'A new stream rises between them. Greek writers begin to argue that disease has natural causes — and attach the argument to a name, Hippocrates, about whom we know almost nothing for certain.' },
  { id: 'huangdi-neijing', zoom: 5, text: 'Look down the map: other rivers were running all along. Chinese medicine takes written shape around the same era. Its founding text is credited to a mythical emperor; the ghost marker shows where tradition puts it, the solid one where the evidence does.' },
  { id: 'sushruta-samhita', zoom: 5, text: 'In India, a compendium describes rebuilding a nose from a flap of skin. Its date is one of the least certain on this map — look at the length of the smear.' },
  { id: 'galen', zoom: 6, text: 'Back in the Roman world, Galen fuses anatomy, experiment and the four humors into a system so complete that it will be taught for well over a thousand years. The thin lines running inside the stream are those long-lived ideas.' },
  { id: 'translation-movement', zoom: 6, text: 'A confluence. In Baghdad, Greek, Syriac, Persian and Sanskrit medicine are translated into Arabic — the tributaries on the map show knowledge crossing from one tradition into another.' },
  { id: 'ibn-sina-canon', zoom: 7, text: 'The Islamic world does not merely preserve; it organizes, tests and extends. One encyclopedia from this stream will be a standard textbook in the Islamic world and in Latin Europe for centuries.' },
  { id: 'arabic-into-latin', zoom: 7, text: 'And then the water flows north-west. Latin Europe, long on the margins of learned medicine, rebuilds its own from Arabic books.' },
  { id: 'black-death', zoom: 8, text: 'Catastrophe. The Black Death kills on a scale learned medicine can neither explain nor stop — and in its wake come quarantine and standing boards of health.' },
  { id: 'vesalius', zoom: 9, text: 'Print, dissection and nerve. Vesalius opens human bodies and shows, in pictures anyone can check, where the ancient authority was wrong.' },
  { id: 'columbian-exchange-epidemics', zoom: 8, text: 'At the top of the map, another stream is nearly extinguished. Old World diseases tear through the Americas; in the other direction come new drugs — among them a bark that cures fevers.' },
  { id: 'harvey', zoom: 10, text: 'The blood circulates. Harvey proves it with arithmetic and experiment — yet treatment barely changes. On this river, understanding and cure often run far apart.' },
  { id: 'jenner', zoom: 12, text: 'Inoculation against smallpox had reached Europe from Asia and Africa. Jenner swaps smallpox matter for cowpox, and vaccination begins: prevention that can be given to a whole population.' },
  { id: 'ether-anaesthesia', zoom: 16, text: 'Here the river fans out into a delta. Within a few decades come anesthesia, germ theory, antisepsis and the laboratory — and medicine splits into the channels you see: surgery, drugs, public health, the lab, the mind.' },
  { id: 'snow-cholera', zoom: 18, text: 'Counting saves lives. A map of deaths around a water pump, and a nurse’s statistics from a war hospital, make the case that disease can be prevented by evidence and plumbing.' },
  { id: 'koch', zoom: 18, text: 'Specific microbes cause specific diseases. With that, two thousand years of humors and bad air are finished — watch those currents end.' },
  { id: 'penicillin', zoom: 20, text: 'The therapeutic revolution. For most of history doctors could comfort far more often than cure; within one lifetime come insulin, antibiotics and vaccines for the diseases that had filled the graveyards.' },
  { id: 'nuremberg-code', zoom: 20, text: 'Power demands rules. The same century that produced the cures also produced medicine’s worst crimes — and, in response, the principle that people must consent to what is done to them.' },
  { id: 'smallpox-eradication', zoom: 22, text: 'A disease that killed hundreds of millions is driven out of existence — so far the only human disease ever eradicated.' },
  { id: 'mrna-vaccines', zoom: 26, text: 'The river reaches the present, running faster than ever: a new virus sequenced in days, a vaccine within a year. The other streams are still flowing beside it. Zoom out, and explore.' },
];
