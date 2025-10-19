declare module '@expo/vector-icons' {
  import type { ComponentType } from 'react';

  const Feather: ComponentType<any>;
  export { Feather };
}

declare module '@expo/vector-icons/Feather' {
  import type { ComponentType } from 'react';

  const Feather: ComponentType<any>;
  export default Feather;
}
