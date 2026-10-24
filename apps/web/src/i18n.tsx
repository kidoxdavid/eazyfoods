import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'fr';

/**
 * Translations are keyed by the English text, so an untranslated string simply shows in English and nothing breaks.
 * Store names, product names, descriptions and staff-edited pages are content, not interface, and stay as written.
 * French here is a working translation for the main shopping path: have a native Canadian-French speaker review it before relying on it.
 */
const FR: Record<string, string> = {
  // header and menu
  'Calgary, Alberta · African groceries from local stores': 'Calgary, Alberta · Épicerie africaine de magasins locaux',
  'Sell on EAZyfoods': 'Vendre sur EAZyfoods', 'Cook with us': 'Cuisinez avec nous', 'Drive with us': 'Livrez avec nous', 'How it works': 'Comment ça marche', 'Help': 'Aide', 'Help centre': 'Centre d’aide',
  'Open all departments': 'Ouvrir tous les rayons', 'All departments': 'Tous les rayons', 'Shop EAZyfoods': 'Magasiner sur EAZyfoods', 'Close menu': 'Fermer le menu',
  'Deliver to': 'Livrer à', 'Choose location': 'Choisir le lieu', 'Department': 'Rayon', 'All': 'Tous', 'Search': 'Rechercher',
  'Search products, brands and stores': 'Rechercher des produits, marques et magasins', 'Search garri, shito, berbere, pondu…': 'Rechercher garri, shito, berbéré, pondu…',
  'Hello, sign in': 'Bonjour, connectez-vous', 'Account': 'Compte', 'Returns &': 'Retours et', 'Orders': 'Commandes', 'Basket': 'Panier', 'Empty': 'Vide', 'Sign in': 'Connexion', 'Sign out': 'Déconnexion',
  'Weekly deals': 'Rabais de la semaine', 'Weekly flyer': 'Circulaire de la semaine', 'New arrivals': 'Nouveautés', 'Recipes': 'Recettes', 'Home chefs': 'Cuisiniers à domicile', 'All stores': 'Tous les magasins',
  'Deals': 'Rabais', 'New': 'Nouveau', 'Stores': 'Magasins', 'Shop': 'Magasiner', 'Browse': 'Parcourir',
  'By region': 'Par région', 'By department': 'Par rayon', 'Partner with us': 'Devenez partenaire', 'Quick links': 'Liens rapides',
  // footer
  'Back to top': 'Haut de page', 'Work with us': 'Travailler avec nous', 'Legal': 'Mentions légales', 'Your orders': 'Vos commandes', 'Install the EAZyfoods app': 'Installer l’application EAZyfoods',
  'Language': 'Langue', 'Gift cards': 'Cartes-cadeaux',
  // product and cards
  'Add to basket': 'Ajouter au panier', 'Out of stock': 'Rupture de stock', 'In stock': 'En stock', 'Quick view': 'Aperçu rapide', 'View basket': 'Voir le panier', 'View': 'Voir',
  'Sold by': 'Vendu par', 'Frequently bought together': 'Souvent achetés ensemble', 'You might also like': 'Vous aimerez aussi', 'Customer reviews': 'Avis des clients', 'Questions about this product': 'Questions sur ce produit',
  'Ask': 'Demander', 'Ask a question': 'Poser une question', 'Compare': 'Comparer', 'Allergens': 'Allergènes', 'Ingredients': 'Ingrédients', 'Storage': 'Conservation', 'Dietary': 'Régime alimentaire',
  'Refund policy': 'Politique de remboursement', 'Lowest': 'Prix le plus bas', 'Save': 'Enregistrer', 'Saved': 'Enregistré',
  // basket
  'Your basket': 'Votre panier', 'Your basket is empty': 'Votre panier est vide', 'Find something you love.': 'Trouvez quelque chose qui vous plaît.', 'Browse products': 'Parcourir les produits',
  'Proceed to checkout': 'Passer à la caisse', 'Clear basket': 'Vider le panier', 'Sign in to check out': 'Connectez-vous pour payer', 'Accept new prices': 'Accepter les nouveaux prix',
  'If unavailable:': 'Si indisponible :', 'Ask me first': 'Me demander d’abord', 'Swap for the closest match': 'Remplacer par le plus proche', 'Just refund it': 'Simplement rembourser', 'Remove': 'Retirer',
  'Open': 'Ouvert', 'Closed': 'Fermé', 'Demo': 'Démo',
  // checkout
  'Checkout': 'Paiement', 'Summary': 'Résumé', 'Total': 'Total', 'Items': 'Articles', 'Discount': 'Rabais', 'Delivery': 'Livraison', 'Delivery (incl. tax)': 'Livraison (taxes incluses)',
  'GST on taxable items': 'TPS sur les articles taxables', 'Driver tip': 'Pourboire du livreur', 'Tip your driver': 'Donner un pourboire au livreur', 'No tip': 'Aucun pourboire', 'Other $': 'Autre $',
  '100% goes to the driver who delivers your order. If the delivery doesn’t happen, it’s refunded.': '100 % du montant va au livreur qui livre votre commande. Si la livraison n’a pas lieu, il est remboursé.',
  'How do you want it?': 'Comment le voulez-vous ?', 'Pickup from the store': 'Cueillette au magasin', 'Delivery address': 'Adresse de livraison', 'Add a new address': 'Ajouter une adresse',
  'We deliver here': 'Nous livrons ici', 'Outside our area': 'Hors de notre zone', 'Save address': 'Enregistrer l’adresse', 'Full name': 'Nom complet', 'Street address': 'Adresse', 'City': 'Ville', 'Postal code': 'Code postal',
  'Extras': 'Suppléments', 'Notes and discount code': 'Notes et code promo', 'Discount code': 'Code promo', 'Apply': 'Appliquer', 'Enter code': 'Entrer le code',
  'Use my store credit': 'Utiliser mon crédit en magasin', 'Store credit': 'Crédit en magasin', 'To pay by card': 'À payer par carte',
  'This is a gift (add a note for the store)': 'C’est un cadeau (ajouter un mot pour le magasin)', 'Gift note': 'Mot pour le cadeau',
  'Continue to payment': 'Continuer vers le paiement', 'Payment': 'Paiement', 'Before you can pay:': 'Avant de payer :', 'Edit basket': 'Modifier le panier',
  'You are not charged until the next step. We never see or store your card number.': 'Vous n’êtes pas débité avant l’étape suivante. Nous ne voyons ni ne conservons jamais votre numéro de carte.',
  // orders
  'Order placed': 'Commande passée', 'Store accepted': 'Acceptée par le magasin', 'Preparing': 'En préparation', 'Ready': 'Prête', 'Out for delivery': 'En cours de livraison', 'Delivered': 'Livrée', 'Collected': 'Cueillie',
  'Report a problem': 'Signaler un problème', 'Order these again': 'Commander à nouveau', 'Cancel': 'Annuler', 'Rate this store': 'Évaluer ce magasin', 'Review': 'Évaluer', 'Waiting for payment': 'En attente du paiement',
  'Give this code to the driver when they arrive:': 'Donnez ce code au livreur à son arrivée :',
  // account, credit, help
  'Your balance': 'Votre solde', 'Have a gift code?': 'Vous avez un code-cadeau ?', 'Invite a friend': 'Inviter un ami', 'History': 'Historique', 'Shopping lists': 'Listes d’achats', 'Alerts': 'Alertes',
  'Contact support': 'Joindre le soutien', 'Send': 'Envoyer', 'Subject': 'Sujet', 'How can we help?': 'Comment pouvons-nous aider ?',
  'Compare delivery to your area': 'Comparer la livraison pour votre secteur', 'Minimum order': 'Commande minimale', 'Rating': 'Évaluation', 'Items in stock': 'Articles en stock', 'Status': 'Statut', 'Open now': 'Ouvert maintenant', 'Closed now': 'Fermé maintenant',
  'This week’s flyer': 'Circulaire de la semaine', 'Print': 'Imprimer',
  'Create your account': 'Créer votre compte', 'Create account': 'Créer un compte', 'Email': 'Courriel', 'Password': 'Mot de passe',
};
const DICT: Record<Lang, Record<string, string>> = { en: {}, fr: FR };

type Ctx = { lang: Lang; setLang: (l: Lang) => void };
const C = createContext<Ctx>({ lang: 'en', setLang: () => {} });

const initial = (): Lang => {
  try {
    const saved = localStorage.getItem('ez_lang'); if (saved === 'fr' || saved === 'en') return saved;
  } catch { /* private mode */ }
  return typeof navigator !== 'undefined' && /^fr\b/i.test(navigator.language) ? 'fr' : 'en';
};

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, set] = useState<Lang>(initial);
  const setLang = useCallback((l: Lang) => { set(l); try { localStorage.setItem('ez_lang', l); } catch { /* ignore */ } }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const v = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <C.Provider value={v}>{children}</C.Provider>;
}

export const useLang = () => useContext(C);

/** t('English text') gives the French when French is chosen and a translation exists, else the English. {name} placeholders are filled from vars. */
export function useT() {
  const { lang } = useLang();
  return useCallback((en: string, vars?: Record<string, string | number>) => {
    let s = DICT[lang][en] ?? en;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    return s;
  }, [lang]);
}

export function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <span className="lang" role="group" aria-label="Language">
      <button type="button" className={lang === 'en' ? 'on' : ''} aria-pressed={lang === 'en'} lang="en" onClick={() => setLang('en')}>EN</button>
      <button type="button" className={lang === 'fr' ? 'on' : ''} aria-pressed={lang === 'fr'} lang="fr" onClick={() => setLang('fr')}>FR</button>
    </span>
  );
}
