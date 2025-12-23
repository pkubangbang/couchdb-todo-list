// deno-lint-ignore-file no-explicit-any
type RestParams<REST extends any[]> = REST extends [infer _E1, ...infer EX]
    ? EX
    : [];

type FunctionRestParam<FN extends (...args: any[]) => any> = RestParams<
    Parameters<FN>
>;

type FunctionWithoutFirstParam<FN extends (...args: any[]) => any> = (
    ...args: FunctionRestParam<FN>
) => ReturnType<FN>;

type VoidFunctionWithoutFirstParam<FN extends (...args: any[]) => void> = (
    ...args: FunctionRestParam<FN>
) => void;

// https://stackoverflow.com/a/57447842/7687543
type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;
