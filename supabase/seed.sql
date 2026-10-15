-- =====================================================================
-- IMMO Suite : données de démonstration (les mêmes que le prototype)
-- Les dates sont relatives au jour du chargement.
--
-- Pour rattacher votre compte à l'agence de démo après inscription :
--   insert into public.membres (agence_id, user_id, role, nom_affiche)
--   select 'a0000000-0000-4000-8000-000000000001', id, 'admin', 'Léa Fabre'
--   from auth.users where email = 'votre@email.fr';
-- =====================================================================

insert into public.agences (id, nom) values
  ('a0000000-0000-4000-8000-000000000001', 'Agence Sainte-Victoire Immobilier');

-- ---------- Contacts : acheteurs ----------
insert into public.contacts (id, agence_id, nom, est_acheteur, source) values
  ('c0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','Claire Moreau',          true,'Portail'),
  ('c0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001','Julien Ferrand',         true,'Vitrine'),
  ('c0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000001','Nadia et Karim Belkacem',true,'Recommandation'),
  ('c0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000001','Thomas Girard',          true,'Portail'),
  ('c0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000001','Sophie Lambert',         true,'Site agence'),
  ('c0000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000001','Marc Delorme',           true,'Portail'),
  ('c0000000-0000-4000-8000-000000000007','a0000000-0000-4000-8000-000000000001','Élodie Brun',            true,'Portail'),
  ('c0000000-0000-4000-8000-000000000008','a0000000-0000-4000-8000-000000000001','Antoine Roux',           true,'Site agence'),
  ('c0000000-0000-4000-8000-000000000009','a0000000-0000-4000-8000-000000000001','Famille Nguyen',         true,'Recommandation');

-- ---------- Contacts : vendeurs ----------
insert into public.contacts (id, agence_id, nom, est_vendeur) values
  ('c0000000-0000-4000-8000-000000000011','a0000000-0000-4000-8000-000000000001','M. et Mme Rossi',true),
  ('c0000000-0000-4000-8000-000000000012','a0000000-0000-4000-8000-000000000001','Paul Martin',    true),
  ('c0000000-0000-4000-8000-000000000013','a0000000-0000-4000-8000-000000000001','Hélène Vidal',   true),
  ('c0000000-0000-4000-8000-000000000014','a0000000-0000-4000-8000-000000000001','Famille Serra',  true),
  ('c0000000-0000-4000-8000-000000000015','a0000000-0000-4000-8000-000000000001','Lucas Petit',    true);

-- ---------- Recherches ----------
insert into public.recherches (agence_id, contact_id, budget_max, villes, surface_min, pieces_min)
select 'a0000000-0000-4000-8000-000000000001', ('c0000000-0000-4000-8000-00000000000' || n)::uuid, budget, villes, surf, pieces
from (values
  (1, 400000, array['Aix-en-Provence'],               60, 3),
  (2, 260000, array['Marseille 6e','Marseille 8e'],   40, 2),
  (3, 480000, array['Aubagne','La Ciotat'],          100, 4),
  (4, 180000, array['La Ciotat','Marseille 6e'],      25, 1),
  (5, 420000, array['Aix-en-Provence','Marseille 8e'],65, 3),
  (6, 550000, array['Marseille 8e'],                  85, 4),
  (7, 430000, array['Aix-en-Provence'],               65, 3),
  (8, 400000, array['Aix-en-Provence'],               60, 3),
  (9, 470000, array['Aubagne'],                      110, 5)
) as r(n, budget, villes, surf, pieces);

-- ---------- Biens ----------
insert into public.biens (id, agence_id, reference, vendeur_id, type, titre, description, ville, surface, pieces, chambres, etage, ascenseur,
                          prix, dpe, ges, charges_annuelles, taxe_fonciere, statut, mandat_signe_le, publie_le) values
('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','AIX-2207','c0000000-0000-4000-8000-000000000011',
 'appartement','T3 lumineux à rénover, quartier des Facultés',
 'Au premier étage d''une petite copropriété des années 70, appartement traversant de 68 m² composé d''une entrée, d''un séjour de 26 m², d''une cuisine indépendante, de deux chambres et d''une salle d''eau. Cave en sous-sol. Proche des facultés, des commerces et des lignes de bus vers le centre.',
 'Aix-en-Provence', 68, 3, 2, 1, false, 389000, 'D','B', 2100, 1350, 'en_vente', current_date - 95, now() - interval '92 days'),
('b0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001','AUB-1934','c0000000-0000-4000-8000-000000000012',
 'maison','Maison familiale avec jardin et garage',
 'Maison de 120 m² sur un terrain de 600 m² arboré, dans un quartier résidentiel calme à dix minutes du centre d''Aubagne. Grand séjour ouvert sur terrasse, cuisine équipée, quatre chambres dont une suite parentale au rez-de-chaussée, garage et buanderie. Écoles et commerces accessibles à pied.',
 'Aubagne', 120, 5, 4, 0, false, 455000, 'C','C', null, 1900, 'en_vente', current_date - 33, now() - interval '31 days'),
('b0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000001','MAR-6118','c0000000-0000-4000-8000-000000000013',
 'appartement','T2 cours Julien',
 'T2 au 4e étage avec ascenseur, proche cours Julien. Idéal premier achat.',
 'Marseille 6e', 45, 2, 1, 4, false, 249000, null, null, 1200, null, 'brouillon', current_date - 6, null),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000001','MAR-8045','c0000000-0000-4000-8000-000000000014',
 'appartement','T4 avec terrasse, proche Prado',
 'Au 5e et dernier étage avec ascenseur, T4 de 92 m² prolongé par une terrasse de 18 m² sans vis-à-vis. Séjour double, cuisine ouverte rénovée, trois chambres, deux salles d''eau. Place de parking en sous-sol. À deux pas du parc Borély et des plages du Prado.',
 'Marseille 8e', 92, 4, 3, 5, true, 520000, 'C','C', 2600, 1700, 'en_vente', current_date - 60, now() - interval '58 days'),
('b0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000001','CIO-0412','c0000000-0000-4000-8000-000000000015',
 'appartement','Studio vue port',
 'Studio de 28 m² au deuxième étage d''un immeuble ancien du centre, avec vue dégagée sur le vieux port. Pièce de vie avec coin nuit, kitchenette équipée et salle d''eau avec WC. Vendu meublé, idéal pour un investissement en location saisonnière ou un pied-à-terre.',
 'La Ciotat', 28, 1, 0, 2, false, 145000, 'E','E', 1300, 620, 'en_vente', current_date - 14, now() - interval '12 days');

-- ---------- Photos ----------
insert into public.photos (agence_id, bien_id, libelle, position, signalement)
select 'a0000000-0000-4000-8000-000000000001', ('b0000000-0000-4000-8000-00000000000' || p.b)::uuid, p.libelle, p.pos, p.sig
from (values
  (1,'Façade',1,null),(1,'Séjour',2,null),(1,'Séjour 2',3,null),(1,'Cuisine',4,null),(1,'Chambre 1',5,null),
  (1,'Chambre 2',6,'floue'),(1,'Salle d''eau',7,null),(1,'Entrée',8,null),(1,'Cave',9,null),
  (2,'Façade',1,null),(2,'Jardin',2,null),(2,'Terrasse',3,null),(2,'Séjour',4,null),(2,'Cuisine',5,null),(2,'Suite parentale',6,null),
  (2,'Chambre 2',7,null),(2,'Chambre 3',8,null),(2,'Chambre 4',9,null),(2,'Salle de bain',10,null),(2,'Garage',11,null),(2,'Vue aérienne',12,null),
  (3,'Séjour',1,'sombre'),(3,'Cuisine',2,null),(3,'Chambre',3,'doublon'),(3,'Chambre',4,null),(3,'Salle d''eau',5,null),
  (4,'Terrasse',1,null),(4,'Séjour',2,null),(4,'Cuisine',3,null),(4,'Chambre 1',4,null),(4,'Chambre 2',5,null),
  (4,'Chambre 3',6,null),(4,'Salle d''eau',7,null),(4,'Parking',8,null),(4,'Vue',9,null),
  (5,'Vue port',1,null),(5,'Pièce de vie',2,null),(5,'Coin nuit',3,null),(5,'Kitchenette',4,null),(5,'Salle d''eau',5,null),
  (5,'Immeuble',6,null),(5,'Cage d''escalier',7,null),(5,'Quartier',8,null)
) as p(b, libelle, pos, sig);

-- ---------- Visites faites (les objections sont détectées par déclencheur) ----------
insert into public.visites (agence_id, bien_id, acheteur_id, date_visite, statut, note, retour)
select 'a0000000-0000-4000-8000-000000000001', ('b0000000-0000-4000-8000-00000000000' || v.b)::uuid,
       ('c0000000-0000-4000-8000-00000000000' || v.a)::uuid, now() - make_interval(days => v.j), 'faite', v.note, v.retour
from (values
  (1,5,84,3,'Appartement agréable mais assez sombre, exposition nord sur le séjour.'),
  (1,1,70,3,'Bien placé. Le séjour manque de lumière et le prix paraît élevé.'),
  (1,8,61,2,'Trop cher par rapport au marché, et pas de parking.'),
  (1,7,49,3,'Bon état général, mais pas de stationnement dans le quartier, c''est bloquant.'),
  (1,5,38,3,'Deuxième visite : toujours hésitante, séjour sombre l''après-midi.'),
  (1,1,27,2,'Le prix reste trop élevé pour un appartement sans parking.'),
  (1,8,24,3,'Volume correct. Exposition nord, peu de lumière naturelle.'),
  (2,3,25,4,'Coup de cœur pour le jardin. Quelques travaux de rafraîchissement à prévoir.'),
  (2,9,14,4,'Maison spacieuse, quartier calme. Le garage est un vrai plus.'),
  (2,3, 6,4,'Seconde visite positive, nous réfléchissons à une offre.'),
  (4,6,50,5,'Terrasse superbe, aucun travaux. Très intéressé.'),
  (4,5,44,4,'Très bel emplacement mais au-dessus de mon budget.'),
  (4,6,36,5,'Contre-visite avec un architecte : offre à venir.'),
  (5,4, 4,4,'Proche du port, idéal en investissement locatif. Charges un peu élevées.')
) as v(b, a, j, note, retour);

-- ---------- Visites planifiées ----------
insert into public.visites (agence_id, bien_id, acheteur_id, date_visite, statut) values
  ('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000004', current_date + 1 + time '10:00', 'planifiee'),
  ('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000003', current_date + 2 + time '17:30', 'planifiee'),
  ('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000009', current_date + 4 + time '11:00', 'planifiee');

-- ---------- Offre acceptée sur le T4 du Prado : crée la transaction ----------
insert into public.offres (id, agence_id, bien_id, acheteur_id, montant, statut, faite_le, repondue_le, compromis_prevu_le) values
  ('f0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000004',
   'c0000000-0000-4000-8000-000000000006', 505000, 'acceptee', current_date - 30, current_date - 28, current_date - 20);

update public.etapes_transaction e set faite_le = e.echeance
from public.transactions t
where t.id = e.transaction_id and t.offre_id = 'f0000000-0000-4000-8000-000000000001'
  and e.code in ('compromis','retractation');

update public.documents_transaction d set recu_le = current_date - 18
from public.transactions t
where t.id = d.transaction_id and t.offre_id = 'f0000000-0000-4000-8000-000000000001'
  and d.libelle in ('Diagnostics techniques (DDT)','Titre de propriété','Règlement de copropriété');

-- ---------- Comptes rendus vendeurs déjà envoyés ----------
insert into public.textes_ia (agence_id, type, bien_id, contact_id, texte, modele, envoye_le)
select 'a0000000-0000-4000-8000-000000000001', 'rapport_vendeur', ('b0000000-0000-4000-8000-00000000000' || r.b)::uuid,
       ('c0000000-0000-4000-8000-0000000000' || r.c)::uuid, 'Compte rendu de commercialisation (archive).', 'regles', now() - make_interval(days => r.j)
from (values (1,'11',40),(2,'12',9),(3,'13',6),(4,'14',3),(5,'15',12)) as r(b, c, j);

-- ---------- Dernier contact des acheteurs (téléphone, e-mail…) ----------
update public.contacts c set dernier_contact_at = now() - make_interval(days => x.j)
from (values (1,27),(2,5),(3,6),(4,4),(5,38),(6,2),(7,49),(8,24),(9,14)) as x(n, j)
where c.id = ('c0000000-0000-4000-8000-00000000000' || x.n)::uuid;

-- ---------- Alertes et tâches initiales ----------
select * from public.rafraichir_alertes('a0000000-0000-4000-8000-000000000001');
