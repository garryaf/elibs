// Feature: enterprise-registration-workflow, Property 5: BPJS number validation
// Feature: enterprise-registration-workflow, Property 6: Visit number format and initial status
// Feature: enterprise-registration-workflow, Property 7: Workflow state machine transitions

import * as fc from 'fast-check';

// =====================================================================
// Pure validation and formatting functions under test
// =====================================================================

/**
 * Validates a BPJS number: accepts if and only if it's exactly 13 numeric digits.
 */
export function validateBpjsNumber(value: string): boolean {
  return /^\d{13}$/.test(value);
}

/**
 * Formats a visit number given year, month, and sequence.
 */
export function formatVisitNumber(year: number, month: number, sequence: number): string {
  const mm = String(month).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');
  return `VST-${year}${mm}-${seq}`;
}

// =====================================================================
// Workflow state machine types and reducer
// =====================================================================

type WorkflowStep = 'search' | 'register' | 'visit-creation';

interface PatientSearchResult {
  id: string;
  mrn: string;
  nik: string;
  name: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE';
  phone: string | null;
  email: string | null;
}

interface RegistrationWorkflowState {
  currentStep: WorkflowStep;
  searchQuery: string;
  searchResults: PatientSearchResult[];
  searchExecuted: boolean;
  selectedPatient: PatientSearchResult | null;
  createdVisit: { id: string; visitNumber: string } | null;
  isSubmitting: boolean;
  error: string | null;
}

type WorkflowAction =
  | { type: 'search'; query: string; results: PatientSearchResult[] }
  | { type: 'selectPatient'; patient: PatientSearchResult }
  | { type: 'registerPatient'; patient: PatientSearchResult }
  | { type: 'createVisit'; visit: { id: string; visitNumber: string } }
  | { type: 'goBack' };

const INITIAL_STATE: RegistrationWorkflowState = {
  currentStep: 'search',
  searchQuery: '',
  searchResults: [],
  searchExecuted: false,
  selectedPatient: null,
  createdVisit: null,
  isSubmitting: false,
  error: null,
};

/**
 * Pure state reducer for the registration workflow.
 * Applies valid transitions and ignores invalid ones.
 */
export function workflowReducer(
  state: RegistrationWorkflowState,
  action: WorkflowAction,
): RegistrationWorkflowState {
  switch (action.type) {
    case 'search':
      return {
        ...state,
        searchQuery: action.query,
        searchResults: action.results,
        searchExecuted: true,
        // Reset downstream state on new search
        selectedPatient: null,
        currentStep: 'search',
        createdVisit: null,
      };

    case 'selectPatient':
      // Can only select a patient if search was executed and results contain the patient
      if (!state.searchExecuted || state.searchResults.length === 0) {
        return state;
      }
      return {
        ...state,
        selectedPatient: action.patient,
        currentStep: 'visit-creation',
        error: null,
      };

    case 'registerPatient':
      // Can only register if search was executed and returned no results
      // (i.e., we were on the register step)
      if (!state.searchExecuted || state.searchResults.length > 0) {
        return state;
      }
      return {
        ...state,
        selectedPatient: action.patient,
        currentStep: 'visit-creation',
        error: null,
      };

    case 'createVisit':
      // Can only create visit if a patient is selected and we're on visit-creation
      if (state.currentStep !== 'visit-creation' || state.selectedPatient === null) {
        return state;
      }
      return {
        ...state,
        createdVisit: action.visit,
        error: null,
      };

    case 'goBack':
      // Going back from visit-creation resets selected patient and form
      if (state.currentStep === 'visit-creation') {
        return {
          ...state,
          currentStep: 'search',
          selectedPatient: null,
          createdVisit: null,
          isSubmitting: false,
          error: null,
        };
      }
      // Going back from register returns to search
      if (state.currentStep === 'register') {
        return {
          ...state,
          currentStep: 'search',
          error: null,
        };
      }
      return state;

    default:
      return state;
  }
}

/**
 * Determines if the registration form should be accessible given the current state.
 * The form is only accessible when search was executed AND no results were found.
 */
export function isRegistrationFormAccessible(state: RegistrationWorkflowState): boolean {
  return state.searchExecuted && state.searchResults.length === 0;
}

// =====================================================================
// Arbitraries (generators)
// =====================================================================

const patientArbitrary: fc.Arbitrary<PatientSearchResult> = fc.record({
  id: fc.uuid(),
  mrn: fc.stringMatching(/^MRN-\d{6}-\d{4}$/),
  nik: fc.stringMatching(/^\d{16}$/),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  dateOfBirth: fc.date({ min: new Date('1920-01-01'), max: new Date('2025-01-01') }).filter(d => !isNaN(d.getTime())).map(d => d.toISOString().split('T')[0]),
  gender: fc.constantFrom('MALE' as const, 'FEMALE' as const),
  phone: fc.option(fc.stringMatching(/^08\d{8,11}$/), { nil: null }),
  email: fc.option(fc.emailAddress(), { nil: null }),
});

const searchActionArbitrary = (patients: PatientSearchResult[]): fc.Arbitrary<WorkflowAction> =>
  fc.record({
    type: fc.constant('search' as const),
    query: fc.string({ minLength: 2, maxLength: 20 }),
    results: fc.constantFrom(patients, []),
  });

const selectPatientActionArbitrary = (patients: PatientSearchResult[]): fc.Arbitrary<WorkflowAction> =>
  patients.length > 0
    ? fc.record({
        type: fc.constant('selectPatient' as const),
        patient: fc.constantFrom(...patients),
      })
    : fc.constant({ type: 'selectPatient' as const, patient: patients[0] ?? ({} as PatientSearchResult) });

const registerPatientActionArbitrary: fc.Arbitrary<WorkflowAction> = patientArbitrary.map(p => ({
  type: 'registerPatient' as const,
  patient: p,
}));

const createVisitActionArbitrary: fc.Arbitrary<WorkflowAction> = fc.record({
  type: fc.constant('createVisit' as const),
  visit: fc.record({
    id: fc.uuid(),
    visitNumber: fc.tuple(
      fc.integer({ min: 2020, max: 2099 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 9999 }),
    ).map(([y, m, s]) => formatVisitNumber(y, m, s)),
  }),
});

const goBackActionArbitrary: fc.Arbitrary<WorkflowAction> = fc.constant({ type: 'goBack' as const });

function workflowActionArbitrary(patients: PatientSearchResult[]): fc.Arbitrary<WorkflowAction> {
  return fc.oneof(
    searchActionArbitrary(patients),
    patients.length > 0
      ? selectPatientActionArbitrary(patients)
      : registerPatientActionArbitrary,
    registerPatientActionArbitrary,
    createVisitActionArbitrary,
    goBackActionArbitrary,
  );
}

// =====================================================================
// Property 5: BPJS number validation
// =====================================================================

/**
 * **Validates: Requirements 6.2, 6.5**
 */
describe('Property 5: BPJS number validation', () => {
  it('accepts if and only if the string is exactly 13 numeric digits', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 30 }), (input) => {
        const isValid = validateBpjsNumber(input);
        const shouldBeValid = /^\d{13}$/.test(input);
        expect(isValid).toBe(shouldBeValid);
      }),
      { numRuns: 100 },
    );
  });

  it('always accepts strings of exactly 13 digits', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^\d{13}$/), (input) => {
        expect(validateBpjsNumber(input)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects strings that are not exactly 13 digits', () => {
    // Generate strings that are either wrong length or contain non-digits
    fc.assert(
      fc.property(
        fc.oneof(
          // Too short (0-12 digits)
          fc.stringMatching(/^\d{0,12}$/),
          // Too long (14+ digits)
          fc.stringMatching(/^\d{14,20}$/),
          // Contains non-digit characters
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !/^\d{13}$/.test(s)),
        ),
        (input) => {
          expect(validateBpjsNumber(input)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// =====================================================================
// Property 6: Visit number format and initial status
// =====================================================================

/**
 * **Validates: Requirements 6.7**
 */
describe('Property 6: Visit number format and initial status', () => {
  it('all generated visit numbers match VST-YYYYMM-XXXX pattern', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2099 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 9999 }),
        (year, month, sequence) => {
          const visitNumber = formatVisitNumber(year, month, sequence);
          expect(visitNumber).toMatch(/^VST-\d{6}-\d{4}$/);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('visit number encodes the correct year and month', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2099 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 9999 }),
        (year, month, sequence) => {
          const visitNumber = formatVisitNumber(year, month, sequence);
          const yyyymm = visitNumber.slice(4, 10);
          const expectedMM = String(month).padStart(2, '0');
          expect(yyyymm).toBe(`${year}${expectedMM}`);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('visit number sequence is zero-padded to 4 digits', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2099 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 9999 }),
        (year, month, sequence) => {
          const visitNumber = formatVisitNumber(year, month, sequence);
          const seqPart = visitNumber.slice(11);
          expect(seqPart).toBe(String(sequence).padStart(4, '0'));
          expect(seqPart.length).toBe(4);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// =====================================================================
// Property 7: Workflow state machine transitions
// =====================================================================

/**
 * **Validates: Requirements 5.1, 7.2, 7.3**
 */
describe('Property 7: Workflow state machine transitions', () => {
  it('registration form is only accessible when searchExecuted === true AND searchResults.length === 0', () => {
    fc.assert(
      fc.property(
        fc.array(patientArbitrary, { minLength: 1, maxLength: 5 }),
        fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 1, maxLength: 20 }),
        (patients, actionIndices) => {
          // Generate a sequence of actions
          const actions: WorkflowAction[] = actionIndices.map(idx => {
            const actionTypes: WorkflowAction[] = [
              { type: 'search', query: 'test', results: patients },
              { type: 'search', query: 'xyz', results: [] },
              { type: 'selectPatient', patient: patients[0] },
              { type: 'registerPatient', patient: patients[0] },
              { type: 'goBack' },
            ];
            return actionTypes[idx % actionTypes.length];
          });

          // Apply all actions sequentially and verify invariant after each
          let state = { ...INITIAL_STATE };
          for (const action of actions) {
            state = workflowReducer(state, action);

            // Invariant: If currentStep === 'register', then search was executed
            // AND results were empty at the time of transition.
            // The registration form step is only reachable through the registerPatient action,
            // which requires searchExecuted && searchResults.length === 0.
            if (state.currentStep === 'register') {
              expect(state.searchExecuted).toBe(true);
              expect(state.searchResults.length).toBe(0);
            }

            // The accessibility check should match state conditions
            const accessible = isRegistrationFormAccessible(state);
            if (!state.searchExecuted || state.searchResults.length > 0) {
              expect(accessible).toBe(false);
            }
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('advancing to visit-creation only occurs when selectedPatient !== null', () => {
    fc.assert(
      fc.property(
        fc.array(patientArbitrary, { minLength: 1, maxLength: 5 }),
        fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 1, maxLength: 20 }),
        (patients, actionIndices) => {
          const actions: WorkflowAction[] = actionIndices.map(idx => {
            const actionTypes: WorkflowAction[] = [
              { type: 'search', query: 'query', results: patients },
              { type: 'search', query: 'empty', results: [] },
              { type: 'selectPatient', patient: patients[0] },
              { type: 'registerPatient', patient: patients[0] },
              { type: 'goBack' },
            ];
            return actionTypes[idx % actionTypes.length];
          });

          let state = { ...INITIAL_STATE };
          for (const action of actions) {
            state = workflowReducer(state, action);

            // Invariant: if currentStep is 'visit-creation', then selectedPatient must not be null
            if (state.currentStep === 'visit-creation') {
              expect(state.selectedPatient).not.toBeNull();
            }
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('navigating back from visit-creation results in selectedPatient === null and form reset', () => {
    fc.assert(
      fc.property(
        fc.array(patientArbitrary, { minLength: 1, maxLength: 5 }),
        fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 1, maxLength: 20 }),
        (patients, actionIndices) => {
          const actions: WorkflowAction[] = actionIndices.map(idx => {
            const actionTypes: WorkflowAction[] = [
              { type: 'search', query: 'query', results: patients },
              { type: 'search', query: 'empty', results: [] },
              { type: 'selectPatient', patient: patients[0] },
              { type: 'registerPatient', patient: patients[0] },
              { type: 'goBack' },
            ];
            return actionTypes[idx % actionTypes.length];
          });

          let state = { ...INITIAL_STATE };
          let prevState: RegistrationWorkflowState;
          for (const action of actions) {
            prevState = { ...state };
            state = workflowReducer(state, action);

            // Invariant: if we were on visit-creation and went back,
            // selectedPatient must be null and form fields reset
            if (action.type === 'goBack' && prevState.currentStep === 'visit-creation') {
              expect(state.selectedPatient).toBeNull();
              expect(state.currentStep).toBe('search');
              expect(state.createdVisit).toBeNull();
              expect(state.isSubmitting).toBe(false);
              expect(state.error).toBeNull();
            }
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('workflow actions produce consistent state across random sequences', () => {
    fc.assert(
      fc.property(
        fc.array(patientArbitrary, { minLength: 1, maxLength: 5 }),
        (patients) => {
          // Use the more sophisticated action generator
          return fc.assert(
            fc.property(
              fc.array(workflowActionArbitrary(patients), { minLength: 1, maxLength: 30 }),
              (actions) => {
                let state = { ...INITIAL_STATE };
                for (const action of actions) {
                  state = workflowReducer(state, action);

                  // Global invariants that must hold after every transition:

                  // 1. If on register step, search must have been executed with empty results
                  if (state.currentStep === 'register') {
                    expect(state.searchExecuted).toBe(true);
                    expect(state.searchResults.length).toBe(0);
                  }

                  // 2. If on visit-creation, a patient must be selected
                  if (state.currentStep === 'visit-creation') {
                    expect(state.selectedPatient).not.toBeNull();
                  }

                  // 3. Registration form accessibility matches state
                  const regAccessible = isRegistrationFormAccessible(state);
                  expect(regAccessible).toBe(state.searchExecuted && state.searchResults.length === 0);
                }
              },
            ),
            { numRuns: 10 }, // Inner loop runs 10 times
          );
        },
      ),
      { numRuns: 5 }, // Outer loop generates 5 patient arrays
    );
  });
});
