
import React from 'react';

/**
 * A Proxy that can be used as a React component.
 * It returns a simple div with the name of the component being rendered.
 */
const stubHandler = {
    get: (target, prop) => {
        // Special case for React internals or common props
        if (prop === '$$typeof' || prop === 'displayName' || prop === 'type') {
            return target[prop];
        }
        return stubComponent(prop);
    },
    // Make the proxy callable so it can be used as a functional component
    apply: (target, thisArg, argumentsList) => {
        const props = argumentsList[0] || {};
        return React.createElement('div', {
            'data-testid': 'component-stub',
            ...props
        }, props.children || 'Stubbed Component');
    }
};

// Target must be a function to be callable
const stubComponent = (name) => {
    const fn = (props) => React.createElement('div', { 'data-testid': `stub-${name}`, ...props }, props.children || name);
    fn.displayName = `Stub(${name})`;
    return fn;
};

const ProxyStub = new Proxy(() => { }, stubHandler);

export default ProxyStub;
