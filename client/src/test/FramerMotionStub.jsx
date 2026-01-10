
import React from 'react';

const motionProxy = new Proxy({}, {
    get: (target, prop) => {
        return React.forwardRef((props, ref) => {
            const { children, whileHover, whileTap, initial, animate, exit, transition, ...rest } = props;
            return React.createElement(prop, { ...rest, ref }, children);
        });
    }
});

export const motion = motionProxy;
export const AnimatePresence = ({ children }) => React.createElement(React.Fragment, null, children);
export const useAnimation = () => ({ start: () => Promise.resolve(), stop: () => { } });
export const useScroll = () => ({ scrollY: { onChange: () => { } }, scrollYProgress: { onChange: () => { } } });
export const useTransform = (val, from, to) => val;
export const useSpring = (val) => val;

export default {
    motion,
    AnimatePresence,
    useAnimation,
    useScroll,
    useTransform,
    useSpring
};
