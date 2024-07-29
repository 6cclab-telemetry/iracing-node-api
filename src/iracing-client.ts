import Axios, { AxiosError, AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { SHA256, enc } from 'crypto-js';
import StatusCodes from 'http-status-codes';
import { CookieJar } from 'tough-cookie';
import {
  AuthResponse,
  CarAssetResponse,
  CarDataResponse,
  EventLogResponse,
  LapDataResponse,
  SessionResult,
  SignedUrl,
  TrackAssetResponse,
  TrackData
} from './types';

type InitOptions = {
  shouldUseInterval: boolean;
};

class IracingClient {
  public authenticated: boolean;
  private apiClient: AxiosInstance;
  private email: string;
  private password: string;
  private interval: NodeJS.Timer | null;
  private options: InitOptions;

  constructor(
    email: string,
    password: string,
    options: InitOptions = { shouldUseInterval: true }
  ) {
    if (!email || !password) {
      throw new Error(
        `Iracing Api: Unable to initialze client. Missing email or password`
      );
    }
    this.email = email;
    this.password = password;
    this.options = options;
    this.authenticated = false;

    this.apiClient = wrapper(
      Axios.create({
        jar: new CookieJar(),
        withCredentials: true,
        baseURL: 'https://members-ng.iracing.com'
      })
    );
    this.signIn();
    this.interval = null;
    this.handleError();
  }

  private handleError() {
    this.apiClient.interceptors.response.use(
      async (config) => {
        if (config.status === StatusCodes.UNAUTHORIZED) {
          this.authenticated = false;
          this.signIn();
        }
        return config;
      },
      (error) => {
        if (error.status === StatusCodes.UNAUTHORIZED) {
          this.authenticated = false;
          this.signIn();
        }
      }
    );
  }

  private encodeCredentials(email: string, password: string): string {
    const hash = SHA256(password + email.toLowerCase());

    return enc.Base64.stringify(hash);
  }

  public async signIn() {
    const hash = this.encodeCredentials(this.email, this.password);
    try {
      const res = await this.apiClient.post<AuthResponse>('/auth', {
        email: this.email,
        password: hash
      });

      if (res?.data?.authcode) {
        this.authenticated = true;
      }
    } catch (error) {
      throw error;
    }
  }

  private async getResource<T>(resourceLink: string = ''): Promise<T> {
    if (!resourceLink) {
      throw new Error('Missing resource url');
    }
    try {
      const res = await this.apiClient.get<T>(resourceLink);
      return res.data as T;
    } catch (error) {
      throw error;
    }
  }

  public async getCarAssets(): Promise<CarAssetResponse> {
    try {
      await this.signIn();
      const res = await this.apiClient.get<SignedUrl>('/data/car/assets');
      const assets = await this.getResource<CarAssetResponse>(res.data?.link);

      return assets;
    } catch (error) {
      throw error;
    }
  }

  public async getTrackData(): Promise<TrackData[]> {
    await this.signIn();
    const res = await this.apiClient.get<SignedUrl>('/data/track/get');
    const trackData = await this.getResource<TrackData[]>(res.data?.link);
    return trackData;
  }

  public async getTrackAssets(): Promise<TrackAssetResponse> {
    await this.signIn();
    const res = await this.apiClient.get<SignedUrl>('/data/track/assets');
    const data = await this.getResource<TrackAssetResponse>(res.data?.link);

    return data;
  }

  public async getCarData(): Promise<CarDataResponse[]> {
    await this.signIn();
    const res = await this.apiClient.get<SignedUrl>('/data/car/get');
    const carData = await this.getResource<CarDataResponse[]>(res.data?.link);
    return carData;
  }

  public async getSessionResults(subsessionId: number): Promise<SessionResult> {
    await this.signIn();
    const res = await this.apiClient.get<SignedUrl>(
      `/data/results/get?subsession_id=${subsessionId}`
    );

    const results = await this.getResource<SessionResult>(res.data?.link);
    return results;
  }

  public async getSessionLogs(
    subsessionId: number,
    sessionNumber: number
  ): Promise<EventLogResponse> {
    await this.signIn();
    const res = await this.apiClient.get<SignedUrl>(
      `/data/results/event_log?subsession_id=${subsessionId}&simsession_number=${sessionNumber}`
    );
    const logs = await this.getResource<EventLogResponse>(res.data?.link);

    return logs;
  }

  public async getLapChartData(
    subsessionId: number,
    sessionNumber: number
  ): Promise<LapDataResponse> {
    await this.signIn();
    const res = await this.apiClient.get<SignedUrl>(
      `/data/results/lap_chart_data?subsession_id=${subsessionId}&simsession_number=${sessionNumber}`
    );
    const signedData = await this.getResource<LapDataResponse>(res.data?.link);

    return signedData;
  }
}

export default IracingClient;
