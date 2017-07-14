/**
 * Convert errorText (json or normal text) to ValidationError
 * 
 * @param {str | json_str | Object | Array} errorText 
 * @param {ValidationError} instance 
 */
export function defaultParseErrors(errorText, instance) {
    if (isString(errorText)) {
        if (errorText) {
            errorText = JSON.parse(errorText);
        } else {
            errorText = {};
        }
    }

    let resNonField = null;
    const resErrors = {};

    const errors = typeof errorText.errors === 'undefined' ? errorText : errorText.errors;
    Object.keys(errors).forEach((key) => {
        if (key === 'non_field_errors') {
            resNonField = instance.prepareError(errors[key]);
        }

        else {
            resErrors[key] = instance.prepareError(errors[key]);
        }
    });

    return [resNonField, resErrors];
}

/**
 * 
 * @param {*} err 
 * @param {ValidationError} instance 
 */
export function defaultPrepareError(err, instance) {
    if (isString(err)) {
        return err;
    }

    else if (isArray(err)) {
        return err.join(', ');
    }

    else if (isObject(err)) {
        // Note: We clone the incoming data just in case
        return new ValidationError(Object.assign({}, err), instance ? instance._customOptions : null, true);
    }

    else {
        return `${err}`;
    }
}