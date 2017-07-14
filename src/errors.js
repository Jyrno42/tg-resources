import { isArray, isObject, isString } from './typeChecks';
import { truncate } from './util';
import { defaultParseErrors, defaultPrepareError } from './parseErrors';


export class BaseResourceError {
    constructor(message) {
        this._message = message;
    }

    toString() {
        return this._message;
    }

    get isNetworkError() { // eslint-disable-line class-methods-use-this
        return false;
    }

    get isInvalidResponseCode() { // eslint-disable-line class-methods-use-this
        return false;
    }

    get isValidationError() { // eslint-disable-line class-methods-use-this
        return false;
    }
}

export class NetworkError extends BaseResourceError {
    constructor(error) {
        super('NetworkError');

        this.error = error;
    }

    get isNetworkError() { // eslint-disable-line class-methods-use-this
        return true;
    }
}

export class InvalidResponseCode extends BaseResourceError {
    constructor(statusCode, responseText, type = 'InvalidResponseCode') {
        super(`${type} ${statusCode}: ${truncate(responseText, 256)}`);

        this.statusCode = statusCode;
        this.responseText = responseText;
    }

    get isInvalidResponseCode() { // eslint-disable-line class-methods-use-this
        return true;
    }
}

export class RequestValidationError extends InvalidResponseCode {
    _options = null;
    _parent = null;

    constructor(statusCode, responseText, options = null) {
        // Set custom options
        this._customOptions = options;

        // Set parent if provided
        this._setParent(parent);

        // parse error body (side-effect: forces I{options} to be resolved)
        this._errors = ValidationError.parseToInternal(responseText, this.options);
    }

    // public api

    get isValidationError() { // eslint-disable-line class-methods-use-this
        return true;
    }

    get isInvalidResponseCode() { // eslint-disable-line class-methods-use-this
        return false;
    }

    get errors() {
        return this._errors;
    }

    // parents + options

    get parent() {
        return this._parent;
    }

    _setParent(parent) {
        this._parent = parent;
    }

    get isBound() {
        return !!this._parent || !!this._options;
    }

    get options() {
        if (!this._options) {
            return mergeOptions(
                DEFAULTS,
                this._parent ? this._parent.options : null,
                this._customOptions,
            );
        }

        return this._options;
    }
}


export class ValidationError {
    constructor(errors, nonFieldErrors = null) {
        this.errors = errors || {};
        this.nonFieldErrors = null;
    }

    getError(fieldName, allowNonFields) {
        if (this.errors[fieldName] || (allowNonFields && this.nonFieldErrors)) {
            return this.errors[fieldName] || this.nonFieldErrors || null;
        }

        return null;
    }

    /**
     * @deprecated Will be removed in the future
     */
    getFieldError(fieldName, allowNonField) {
        return this.getError(fieldName, allowNonField);
    }

    firstError(allowNonField) {
        if (allowNonField && this.nonFieldErrors) {
            return this.nonFieldErrors;
        }

        const errs = Object.keys(this.errors);

        if (errs.length > 0) {
            return this.errors[errs[0]];
        }

        return null;
    }

    static parseToInternal(errorText, options) {
        return options.parseErrors(errorText, {
            parseErrors: options.parseErrors,
            prepareError: options.prepareError,
        });
    }
}
