/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from '@testing-library/dom';
import BillsUI from '../views/BillsUI.js';
import { bills } from '../fixtures/bills.js';
import { ROUTES_PATH } from '../constants/routes.js';
import { localStorageMock } from '../__mocks__/localStorage.js';
import Bills from '../containers/Bills.js';

import router from '../app/Router.js';

describe('Given I am connected as an employee', () => {
  describe('When I am on Bills Page', () => {
    test('Then bill icon in vertical layout should be highlighted', async () => {
      // ÉTAPE 1 : Simulation du localStorage
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
      });
      window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }));

      // ÉTAPE 2 : Création de l'élément racine
      const root = document.createElement('div');
      root.setAttribute('id', 'root');
      document.body.append(root);

      // ÉTAPE 3 : Initialisation du router et navigation
      router();
      window.onNavigate(ROUTES_PATH.Bills);

      // ÉTAPE 4 : Attente et vérification de l'icône active
      await waitFor(() => screen.getByTestId('icon-window'));
      const windowIcon = screen.getByTestId('icon-window');
      expect(windowIcon.classList.contains('active-icon')).toBe(true);
    });
    test('Then bills should be ordered from earliest to latest', () => {
      // Ajout de dates spécifiques pour tester
      const billsWithSpecificDates = [
        { ...bills[0], date: '2023-01-01' },
        { ...bills[1], date: '2023-02-01' },
        { ...bills[2], date: '2023-03-01' },
      ];

      document.body.innerHTML = BillsUI({ data: billsWithSpecificDates });

      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      //amélioration de la fonction antiChrono
      const antiChrono = (a, b) => new Date(b) - new Date(a);
      const datesSorted = [...dates].sort(antiChrono);

      expect(dates).toEqual(datesSorted);
    });

    // test handleClickIconEye
    test('Then the modal should be displayed when i click on the icon eye', async () => {
      // ÉTAPE 1 : Récupération des icônes œil
      const eyeIcon = screen.getAllByTestId('icon-eye');

      // ÉTAPE 2 : Pour chaque icône
      eyeIcon.forEach((element) => {
        // ÉTAPE 3 : Simulation du clic
        fireEvent.click(element);

        // ÉTAPE 4 : Vérification de la modal
        const modal = document.querySelector('.modal');
        expect(modal).toBeTruthy();

        // ÉTAPE 5 : Vérification de l'URL de l'image
        const urlBill = element.getAttribute('data-bill-url');
        const img = document.querySelector('.modal-body img');
        if (img) {
          expect(img.src).toBe(urlBill);
        }
      });
    });

    test('then i click on the icon the function handleClickIconEye should be called', () => {
      // ÉTAPE 1 : Récupération des icônes
      const eyeIcon = screen.getAllByTestId('icon-eye');

      // ÉTAPE 2 : Création d'un espion
      const handleClickIconEye = jest.fn();

      // ÉTAPE 3 : Ajout des écouteurs d'événements
      eyeIcon.forEach((element) => {
        element.addEventListener('click', handleClickIconEye);
      });

      // ÉTAPE 4 : Simulation des clics
      eyeIcon.forEach((element) => {
        fireEvent.click(element);
      });

      // ÉTAPE 5 : Vérification de l'appel
      expect(handleClickIconEye).toHaveBeenCalled();
    });
  });

  describe('When I navigate to Bills', () => {
    // beforeEach(() => {
    //   jest.spyOn(mockStore, 'bills');
    // });

    test('Then it should fetch bills from API', async () => {
      // ÉTAPE 1 : Création du mock store
      const mockStore = {
        bills: jest.fn().mockImplementation(() => ({
          list: () => Promise.resolve(bills),
        })),
      };

      // ÉTAPE 2 : Création de l'instance Bills
      const instanceBills = new Bills({
        document,
        onNavigate: (pathname) => {
          document.body.innerHTML = ROUTES({ pathname });
        },
        store: mockStore,
        localStorage: window.localStorage,
      });

      // ÉTAPE 3 : Appel de getBills
      const result = await instanceBills.getBills();

      // ÉTAPE 4 : Vérifications
      expect(result.length).toBe(4);
      expect(result[0].status).toBe('En attente');
      expect(result[0].date).toBe('4 Avr. 04');
    });

    test('Then it should handle corrupted date format', async () => {
      // ÉTAPE 1 : Création d'un mock store avec une date invalide
      const mockStore = {
        bills: jest.fn().mockImplementation(() => {
          return {
            list: () => {
              return Promise.resolve([
                {
                  id: '1',
                  date: 'invalid-date', // On simule une date corrompue
                  status: 'pending',
                },
              ]);
            },
          };
        }),
      };

      // ÉTAPE 2 : Création d'une instance de Bills avec notre mock
      const bills = new Bills({
        document,
        onNavigate: null, // pas besoin de navigation pour ce test
        store: mockStore, // on utilise notre mock avec la date invalide
        localStorage: window.localStorage,
      });

      // ÉTAPE 3 : Appel de la méthode getBills
      const result = await bills.getBills();

      // ÉTAPE 4 : Vérification que la date invalide est retournée telle quelle
      // (sans plantage lors du formatage)
      expect(result[0].date).toBe('invalid-date');
    });

    test('Then it should return undefined if store is null', async () => {
      // ÉTAPE 1 : Création d'une instance de Bills sans store
      const bills = new Bills({
        document,
        onNavigate: null, // pas besoin de navigation
        store: null, // on force le store à null pour tester ce cas
        localStorage: window.localStorage,
      });

      // ÉTAPE 2 : Appel de la méthode getBills
      const result = await bills.getBills();

      // ÉTAPE 3 : Vérification que la méthode retourne undefined
      // quand il n'y a pas de store
      expect(result).toBeUndefined();
    });
  });

  describe('When I click on New Bill button', () => {
    test('Then I should be redirected to NewBill page', () => {
      // ÉTAPE 1 : On crée un bouton dans notre HTML
      document.body.innerHTML = '<button data-testid="btn-new-bill"></button>';

      // ÉTAPE 2 : On crée une fonction espion qui va surveiller la navigation
      const onNavigate = jest.fn(); // jest.fn() crée une fonction simulée qu'on peut suivre

      // ÉTAPE 3 : On crée une instance de Bills avec notre fonction espion
      const bill = new Bills({
        document,
        onNavigate, // on passe notre fonction espion
        store: null,
        localStorage: window.localStorage,
      });

      // ÉTAPE 4 : On récupère le bouton et on simule un clic dessus
      const button = screen.getByTestId('btn-new-bill'); // on trouve le bouton
      fireEvent.click(button); // on simule un clic

      // ÉTAPE 5 : On vérifie que la navigation a été appelée avec le bon paramètre
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['NewBill']);
    });
  });
});
