import { ValidationError } from './errors';
import { defaultParseErrors, defaultPrepareError } from './parseErrors';


const DEFAULTS = {
    apiRoot: '',
    mutateResponse: null,
    headers: null,
    cookies: null,

    prepareError: defaultPrepareError,
    parseErrors: defaultParseErrors,

    statusSuccess: [200, 201, 204],
    statusValidationError: [400],

    defaultHeaders: {
        Accept: 'application/json',
    },
};

export default DEFAULTS;
