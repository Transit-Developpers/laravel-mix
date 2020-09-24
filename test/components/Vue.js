import test from 'ava';
import mockRequire from 'mock-require';
import VueComponent from '../../src/components/Vue';
import Log from '../../src/Log';

let component;

test.before(() => {
    return (component = new VueComponent());
});

test('it detects Vue 2', t => {
    mockRequire('vue', { version: '2.0' });

    t.is(2, component.resolveVueVersion());

    mockRequire.stop('vue');
});

test('it detects Vue 3', t => {
    mockRequire('vue', { version: '3.0' });

    t.is(3, component.resolveVueVersion());

    mockRequire.stop('vue');
});

test('it aborts if Vue is not installed', t => {
    Log.fake();

    t.throws(() => component.resolveVueVersion());

    t.true(Log.received(`couldn't find Vue in your project`));
});

test('it aborts if an unsupported Vue version is provided', t => {
    mockRequire('vue', { version: '100.0' });

    Log.fake();

    t.throws(() => component.resolveVueVersion(100));

    t.true(Log.received('Vue 100 is not yet supported'));

    mockRequire.stop('vue');
});
