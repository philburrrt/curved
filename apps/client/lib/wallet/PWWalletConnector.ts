import { PublicClient } from "wagmi";
import {
  Account,
  Chain,
  HttpTransport,
  createPublicClient,
  createWalletClient,
} from "viem";
import { Connector, WalletClient } from "wagmi";
import { privateKeyToAccount } from "viem/accounts";
import { combineKey, getLocalStorage } from "./utils";

/*******************************************/

export interface PWWalletOptions {
  chain: Chain;
  transport: HttpTransport;
  getToken: () => Promise<string | null>;
}

export type PWConnectorOptions = {
  /** Name of connector */
  name?: string | ((detectedName: string | string[]) => string);
  /**
   * [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) Ethereum Provider to target
   *
   * @default
   * () => typeof window !== 'undefined' ? window.ethereum : undefined
   */
  getProvider?: () => PublicClient | undefined;
  /**
   * MetaMask and other injected providers do not support programmatic disconnect.
   * This flag simulates the disconnect behavior by keeping track of connection status in storage. See [GitHub issue](https://github.com/MetaMask/metamask-extension/issues/10353) for more info.
   * @default true
   */
  shimDisconnect?: boolean;
};

export class PWWalletConnector extends Connector<
  PublicClient,
  PWWalletOptions
> {
  readonly id = "PWWallet";
  readonly name = "PW Wallet";

  ready = false;
  authShard = "";

  #provider?: PublicClient;
  #wallet?: WalletClient;

  #account?: Account;

  constructor(config: { chains?: Chain[]; options: PWWalletOptions }) {
    super(config);

    // this.ready = true;
  }

  async getProvider() {
    if (!this.#provider) {
      // this.#provider = new PWWalletProvider(this.options)
      this.#provider = createPublicClient(this.options);
    }
    return this.#provider;
  }

  async getSigner() {
    return this.#account;
  }

  async connect(config?: { chainId?: number | undefined }) {
    if (!import.meta.env.VITE_API_URL) throw new Error("SERVER ERROR");
    const res = await fetch(`${import.meta.env.VITE_API_URL}/auth`, {
      headers: {
        Authorization: `Bearer ${await this.options.getToken()}`,
      },
    });
    const { authShard } = await res.json();

    const localShard = getLocalStorage("shard");

    if (!authShard || !localShard) throw new Error("invalid shards");

    this.authShard = authShard;

    const key = await combineKey(localShard, authShard);

    if (!this.#account) {
      this.#account = privateKeyToAccount(key);
    }

    const cChain = config?.chainId
      ? this.chains.find((chain) => chain.id === config.chainId)
      : this.options.chain;

    if (!cChain) throw new Error("invalid chain");

    this.options.chain = cChain;

    const account = this.#account;

    this.#wallet = createWalletClient({
      ...this.options,
      account,
    });

    this.ready = true;

    return {
      account: account.address,
      chain: { id: cChain.id, unsupported: false },
    };
  }

  async disconnect() {
    this.ready = false;
  }

  async getAccount() {
    if (!this.ready || !this.#account?.address)
      throw new Error("accoutn not found");

    return this.#account.address;
  }

  async getChainId() {
    return this.options.chain.id;
  }

  async isAuthorized(): Promise<boolean> {
    if (!this.#wallet) return false;
    try {
      return (await this.#wallet.getAddresses())?.length > 0;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async getWalletClient(config?: { chainId?: number | undefined } | undefined) {
    if (!this.#wallet) await this.connect(config);
    if (!this.#wallet) throw new Error("wallet not connected");

    return this.#wallet;
  }

  protected onAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) this.emit("disconnect");
    else
      this.emit("change", {
        account: await this.getAccount(),
      });
  };

  protected onChainChanged = (chainId: number) => {
    console.log(`onChainChanged`);
    console.log(chainId);

    this.emit("change", { chain: { id: chainId, unsupported: false } });
  };

  protected onDisconnect = async (error: Error) => {
    console.log(`onDisconnect`);
    console.log(error);

    this.emit("disconnect");
  };
}
