import nextVitals from "eslint-config-next/core-web-vitals";

const ignores = {
  ignores: [".next/**", "node_modules/**", "out/**", "next-env.d.ts"],
};

const config = [
  ignores,
  ...nextVitals,
  {
    rules: {
      "@next/next/no-img-element": "off",
      "react-hooks/purity": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
