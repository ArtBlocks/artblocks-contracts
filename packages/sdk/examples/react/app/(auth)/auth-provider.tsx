"use client";

import { useEffect, useReducer, createContext, useContext } from "react";
import { useAccount, useDisconnect, useWalletClient } from "wagmi";
import { WalletClient } from "wagmi";
import { getAuthMessage, getJWT } from "./api";

interface AuthState {
  loading: boolean;
  jwt?: string;
  expiration?: number;
}

type AuthAction =
  | { type: "AUTHENTICATING" }
  | { type: "AUTHENTICATED"; payload: AuthState }
  | { type: "SIGNOUT" };

type AuthDispatch = (action: AuthAction) => void;

type AuthContextValues = AuthState & {
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValues | undefined>(undefined);

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "AUTHENTICATING": {
      return { ...state, loading: true };
    }
    case "AUTHENTICATED": {
      return { ...state, ...action.payload, loading: false };
    }
    case "SIGNOUT": {
      return {
        ...state,
        jwt: undefined,
        expiration: undefined,
      };
    }
  }
}

async function authenticate(
  dispatch: AuthDispatch,
  address: string,
  signer: WalletClient
): Promise<void> {
  dispatch({ type: "AUTHENTICATING" });
  const message = await getAuthMessage(
    address,
    window.location.host,
    window.location.origin
  );

  const signature = await signer.signMessage({ message });

  const { jwt, expiration } = await getJWT({
    message,
    publicAddress: address.toLowerCase(),
    signature,
  });

  dispatch({
    type: "AUTHENTICATED",
    payload: { jwt, expiration, loading: false },
  });
}

function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [state, dispatch] = useReducer(authReducer, { loading: false });
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const { data: signer } = useWalletClient();
  const { disconnect } = useDisconnect();

  const jwt = state.jwt;
  useEffect(() => {
    if (address && signer && !state.loading && !jwt) {
      authenticate(dispatch, address, signer);
    }

    if (jwt && !isConnected) {
      dispatch({ type: "SIGNOUT" });
    }
  }, [address, isConnected, signer, jwt, isConnecting, isReconnecting]);

  function signOut() {
    disconnect();
  }

  return (
    <AuthContext.Provider value={{ ...state, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth(): AuthContextValues {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthState must be used within a AuthProvider");
  }
  return context;
}

export { AuthProvider, useAuth };
