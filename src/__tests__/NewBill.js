/**
 * @jest-environment jsdom
 */

import { screen, fireEvent, waitFor } from '@testing-library/dom';
import NewBillUI from '../views/NewBillUI.js';
import NewBill from '../containers/NewBill.js';
import { localStorageMock } from '../__mocks__/localStorage.js';
import { ROUTES_PATH } from '../constants/routes.js';
import { store } from '../__mocks__/store.js';

const mockStore = store;

describe('Given I am connected as an employee', () => {
  describe('When I am on NewBill Page', () => {
    // Test 1 : Simple vérification du formulaire
    test('Then the form should be displayed', () => {
      document.body.innerHTML = NewBillUI();
      const form = screen.getByTestId('form-new-bill');
      expect(form).toBeTruthy();
    });

    // Test 2 : Rejet fichier invalide
    test('Then file with invalid extension should be rejected', () => {
      document.body.innerHTML = NewBillUI();
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        'user',
        JSON.stringify({ email: 'test@test.com' })
      );
      global.alert = jest.fn();

      const newBill = new NewBill({
        document,
        onNavigate: jest.fn(),
        store: null,
        localStorage: window.localStorage,
      });

      const fileInput = screen.getByTestId('file');
      fireEvent.change(fileInput, {
        target: {
          files: [new File([''], 'document.txt', { type: 'text/plain' })],
        },
      });

      expect(global.alert).toHaveBeenCalled();
      expect(fileInput.value).toBe('');
    });

    // Test 3 : Fichier valide
    test('Then file with valid extension (jpg) should be accepted', () => {
      document.body.innerHTML = NewBillUI();
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        'user',
        JSON.stringify({ email: 'test@test.com' })
      );

      const store = {
        bills: jest.fn().mockImplementation(() => ({
          create: jest.fn().mockResolvedValue({
            fileUrl: 'http://localhost/image.jpg',
            key: '1234',
          }),
        })),
      };

      const newBill = new NewBill({
        document,
        onNavigate: jest.fn(),
        store,
        localStorage: window.localStorage,
      });

      const file = new File(['image'], 'image.jpg', { type: 'image/jpeg' });
      const inputFile = screen.getByTestId('file');

      fireEvent.change(inputFile, {
        target: {
          files: [file],
        },
      });

      expect(inputFile.files[0].name).toBe('image.jpg');
    });

    // Test 4 : test de la fonction handleSubmit
    test('Then bill should be created when form is submitted', () => {
      document.body.innerHTML = NewBillUI();
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        'user',
        JSON.stringify({ email: 'test@test.com' })
      );

      const onNavigate = jest.fn();
      const newBill = new NewBill({
        document,
        onNavigate,
        store: {
          bills: jest.fn().mockImplementation(() => ({
            update: jest.fn().mockResolvedValue({}),
          })),
        },
        localStorage: window.localStorage,
      });

      const form = screen.getByTestId('form-new-bill');
      fireEvent.submit(form);

      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['Bills']);
    });

    // Test 5 : création du formData et l'appel à l'API
    test('Then file should be uploaded to API when valid file is selected', () => {
      document.body.innerHTML = NewBillUI();
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        'user',
        JSON.stringify({ email: 'test@test.com' })
      );

      const store = {
        bills: jest.fn().mockReturnValue({
          create: jest.fn().mockResolvedValue({
            fileUrl: 'http://localhost/image.jpg',
            key: '1234',
          }),
        }),
      };

      const newBill = new NewBill({
        document,
        onNavigate: jest.fn(),
        store,
        localStorage: window.localStorage,
      });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const inputFile = screen.getByTestId('file');

      Object.defineProperty(inputFile, 'files', { value: [file] });

      const event = {
        preventDefault: jest.fn(),
        target: {
          value: 'C:\\fakepath\\test.jpg',
          files: [file],
        },
      };

      newBill.handleChangeFile(event);

      expect(store.bills).toHaveBeenCalled();
    });
  });

  // Test d'intégration POST
  describe('When I post a new bill', () => {
    beforeEach(() => {
      // Initialisation du localStorage
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        'user',
        JSON.stringify({ type: 'Employee', email: 'a@a' })
      );
    });

    // Ajout d'un test pour vérifier le comportement complet
    test('should handle the complete form submission', async () => {
      document.body.innerHTML = NewBillUI();
      const newBill = new NewBill({
        document,
        onNavigate: jest.fn(),
        store: mockStore,
        localStorage: window.localStorage,
      });

      // Simulation du remplissage du formulaire
      const form = screen.getByTestId('form-new-bill');
      const inputData = {
        type: 'Transports',
        name: 'Test',
        amount: '100',
        date: '2023-04-04',
        vat: '20',
        pct: '20',
        commentary: 'Test comment',
      };

      // Remplir les champs
      const typeInput = screen.getByTestId('expense-type');
      const nameInput = screen.getByTestId('expense-name');
      const amountInput = screen.getByTestId('amount');
      const dateInput = screen.getByTestId('datepicker');
      const vatInput = screen.getByTestId('vat');
      const pctInput = screen.getByTestId('pct');
      const commentaryInput = screen.getByTestId('commentary');

      fireEvent.change(typeInput, { target: { value: inputData.type } });
      fireEvent.change(nameInput, { target: { value: inputData.name } });
      fireEvent.change(amountInput, { target: { value: inputData.amount } });
      fireEvent.change(dateInput, { target: { value: inputData.date } });
      fireEvent.change(vatInput, { target: { value: inputData.vat } });
      fireEvent.change(pctInput, { target: { value: inputData.pct } });
      fireEvent.change(commentaryInput, {
        target: { value: inputData.commentary },
      });

      // Submit form
      const handleSubmit = jest.fn(newBill.handleSubmit);
      form.addEventListener('submit', handleSubmit);
      fireEvent.submit(form);

      expect(handleSubmit).toHaveBeenCalled();
    });
  });
});
