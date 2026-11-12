import { useEffect, useState } from 'react';

import type { DynamicHookProps, InnerDynamicHookProps } from './dynamicHook.types';


/**
 * React high order component to wrap the given component "DynamicHook" with a dynamically imported
 * hook function.
 */
const withDynamicHook = <T extends InnerDynamicHookProps>(Component: React.ComponentType<T>) => {
  const WithDynamicHook = (props: DynamicHookProps & Omit<T, keyof InnerDynamicHookProps>) => {
    // ------------------------------------------------------------------<editor-fold desc="States">
    // States
    // ---------------------------------------------------------------------------------------------

    const { path, onSetHook } = props;

    const [hook, setHook] = useState<InnerDynamicHookProps['hook']>();


    //                                                                                </editor-fold>
    // ---------------------------------------------------------<editor-fold desc="Local Variables">
    // Local Variables
    // ---------------------------------------------------------------------------------------------


    //                                                                                </editor-fold>
    // --------------------------------------------------------<editor-fold desc="Helper Functions">
    // Helper Functions
    // ---------------------------------------------------------------------------------------------


    //                                                                                </editor-fold>
    // ----------------------------------------------------------<editor-fold desc="Event Handlers">
    // Event Handlers
    // ---------------------------------------------------------------------------------------------


    //                                                                                </editor-fold>
    // -----------------------------------------------------------------<editor-fold desc="Effects">
    // Effects
    // ---------------------------------------------------------------------------------------------

    useEffect(() => {
      if (path === 'useCommon') {
        if (process.env['PATH_USECOMMON']) {
          import(/* webpackInclude: /index\.[jt]s$/i */process.env['PATH_USECOMMON']).then((module: { default: InnerDynamicHookProps['hook'] }) => {
            setHook(() => module.default);
          }).catch((e: unknown) => {
            throw new Error(`Laoding hook "${path}" failed: ${(e instanceof Error) ? e.message : String(e)}`);
          });
        }
      } else if (path && process.env['PATH_CONTENTS']) {
        import(/* webpackInclude: /index\.[jt]s$/i */process.env['PATH_CONTENTS'] + path).then((module: { default: InnerDynamicHookProps['hook'] }) => {
          setHook(() => module.default);
        }).catch((e: unknown) => {
          throw new Error(`Laoding hook "${path}" failed: ${(e instanceof Error) ? e.message : String(e)}`);
        });
      }
    }, [path]);


    useEffect(() => {
      if (hook) {
        onSetHook?.();
      }
    }, [hook, onSetHook]);


    //                                                                                </editor-fold>
    // ------------------------------------------------------------------<editor-fold desc="Render">
    // Render
    // ---------------------------------------------------------------------------------------------

    if (!hook) {
      return null;
    }

    return (
      <Component {...props as T} hook={hook} />
    );
  };

  WithDynamicHook.displayName = `withDynamicHook(${Component.displayName || Component.name || 'Component'})`;

  return WithDynamicHook;
};


export { withDynamicHook };
