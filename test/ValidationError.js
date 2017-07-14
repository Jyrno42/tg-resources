import { expect } from 'chai';

import { ValidationError } from '../index';

let instance = null;

const responseBody = {
    statusCode: 400,
    responseText: JSON.stringify({
        errors: {
            non_field_errors: [                              // string (joined by space)
                'Something is generally broken',
            ],

            password: [                                      // string (joined by space)
                'too short',
                'missing numbers',
            ],

            email: {                                         // Nested (object) ValidationError
                something: 'be wrong yo',                    // string
            },

            // Will be converted to a string
            remember: false,

            deliveryAddress: [                               // Nested (list) ValidationError
                {                                            // Nested (object) ValidationError
                    non_field_errors: [
                        'Provided address is not supported', // string (joined by space)
                    ],
                },
                null,                                        // null
                {                                            // Nested (object) ValidationError
                    zip: 'Please enter a valid address',     // string
                    country: [                               // string (joined by space)
                        'This field is required.',
                        'Please select a valid country.'
                    ]
                },
                undefined,                                   // null (since no errors)
                {                                            // null (since no errors)
                    non_field_errors: [],
                },
                {}                                           // null (since no errors)
            ],

            paymentMethods: []                               // null
        },
    }),
};

/*
Expected result:

ValidationError({
    nonFieldErrors: 'Something is generally broken',
    errors: {
        password: 'Too short, missing numbers',
        email: ValidationError({
            nonFieldErrors: null,
            errors: {
                something: 'be wrong yo',
            },
        }),
        remember: 'false',
        deliveryAddress: ListValidationError({
            nonFieldErrors: undefined,  // unused for list validation errors (e.g. always undefined)
            errors: [
                ValidationError({
                    nonFieldErrors: 'Provided address is not supported',
                    errors: {},
                }),
                null,
                ValidationError({
                    nonFieldErrors: null,
                    errors: {
                        zip: 'Please enter a valid address',
                        country: 'This field is required. Please select a valid country.',
                    }
                }),
                null,
                null,
                null,
            ],
        }),
        // paymentMethods omitted since it evaluates to an empty array (which are ignored)
    }
})*/

// Split ValidationError to RequestValidationError and ValidationError
//
//  Why: Simplifies code for validationError (and keeps response specific logic separate from
//   error handling logic)
//
//    RequestValidationError.isValidationError => true
//    get RequestValidationError.error : ValidationError => RequestValidationError._error
//    get RequestValidationError.errors => RequestValidationError.error (proxy, mby remove (?) or 
//        use errors everywhere so api is similar to ValidationError)
//
//    get ValidationErrors.errors : {str: ?ValidationError} => ValidationErrors._errors
//
//  Note: Must remain as configurable as it was (ideally we would increase configurability w/ this change)

const getValidationErrorWithNonField = nonField => (new ValidationError({
    responseText: JSON.stringify({
        errors: {
            non_field_errors: nonField,
            foo: ['bar', 'baz'],
        },
    }),
}));


export default {
    'ValidationError api:': {
        beforeEach() {
            instance = new ValidationError(responseBody);
        },

        'constructor works': () => {
            // ResponseText can be empty
            new ValidationError({ responseText: '' });

            // ResponseText can be mising
            new ValidationError({});

            // No args also works
            new ValidationError();
        },
        'instance.statusCode is correct': () => {
            expect(instance.statusCode).to.equal(400);
        },
        'instance.responseText is correct': () => {
            expect(instance.responseText).to.equal(responseBody.responseText);
        },
        'toString works': () => {
            expect(instance.toString()).to.equal(`ValidationError 400: ${responseBody.responseText}`);
            expect(instance.toString()).to.equal(instance._message);
        },
        'isNetworkError is false': () => {
            expect(instance.isNetworkError).to.equal(false);
        },
        'isInvalidResponseCode is false': () => {
            expect(instance.isInvalidResponseCode).to.equal(false);
        },
        'isValidationError is true': () => {
            expect(instance.isValidationError).to.equal(true);
        },
        'errors are normalized correctly': () => {
            expect(instance.nonFieldErrors).to.equal('Something is generally broken');
            expect(instance.errors).to.be.a('object');

            expect(instance.errors.password).to.be.equal('too short, missing numbers');
            expect(instance.errors.remember).to.be.equal('false');

            // Nested ValidationError objects
            expect(instance.errors.email).to.be.a.instanceof(ValidationError);
            expect(instance.errors.email.errors.something).to.be.equal('be wrong yo');
        },
        'getFieldError works': () => {
            expect(instance.getFieldError).to.be.a('function');

            expect(instance.getFieldError('password')).to.be.equal('too short, missing numbers');
            expect(instance.getFieldError('remember')).to.be.equal('false');

            // Nested ValidationError objects
            expect(instance.getFieldError('email')).to.be.a.instanceof(ValidationError);
            expect(instance.getFieldError('email').getFieldError).to.be.a('function');
            expect(instance.getFieldError('email').getFieldError('something')).to.be.equal('be wrong yo');

            expect(instance.getFieldError('random-field')).to.be.a('null');
            expect(instance.getFieldError('random-field', true)).to.be.equal('Something is generally broken');
        },
        'firstError works': () => {
            expect(instance.firstError).to.be.a('function');

            // First error without allowNonField MUST be the password error
            expect(instance.firstError()).to.be.equal('too short, missing numbers');

            // First error with allowNonField MUST be the nonFieldError
            expect(instance.firstError(true)).to.be.equal('Something is generally broken');

            // First error with allowNonField without non_field_errors MUST be a field error
            expect(new ValidationError({
                responseText: JSON.stringify({
                    errors: {
                        foo: ['bar', 'baz'],
                    },
                }),
            }).firstError(true)).to.be.equal('bar, baz');

            // If no errors it MUST return null
            expect(new ValidationError({
                responseText: '{}',
            }).firstError()).to.be.a('null');
        },
        'True evaluates to an error (nonFieldErrors)': () => {
            // also MUST be converted to str
            expect(getValidationErrorWithNonField(true).nonFieldErrors).to.be.equal('true');
        },
        'empty string evaluates to null (nonFieldErrors)': () => {
            expect(getValidationErrorWithNonField('').nonFieldErrors).to.be.a('null');
        },
        'undefined/null/false evaluate to null (nonFieldErrors)': () => {
            expect(getValidationErrorWithNonField(undefined).nonFieldErrors).to.be.a('null');
            expect(getValidationErrorWithNonField(null).nonFieldErrors).to.be.a('null');
            expect(getValidationErrorWithNonField(false).nonFieldErrors).to.be.a('null');
        },
        'empty array evaluates to null (nonFieldErrors)': () => {
            expect(getValidationErrorWithNonField([]).nonFieldErrors).to.be.a('null');
        },
        'empty object evaluates to null (nonFieldErrors)': () => {
            expect(getValidationErrorWithNonField({}).nonFieldErrors).to.be.a('null');
        },
    },
};
