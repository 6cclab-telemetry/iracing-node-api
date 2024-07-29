import { describe } from 'node:test';
import IracingClient from '..';
import { mockNockHelper } from './helpers';
import { StatusCodes } from 'http-status-codes';

const mockReplyPath = __dirname + '/replies/';
describe('Iracing Api Client', () => {
  beforeAll(() => {});
  beforeEach(() => {
    mockNockHelper()
      .post('/auth')
      .replyWithFile(StatusCodes.OK, mockReplyPath + 'auth.json');
  });
  describe('Initialization', () => {
    it('should login user when initialized', async () => {
      const client = new IracingClient('email', 'password', {
        shouldUseInterval: false
      });
      const signIn = jest.fn(() => client.signIn());
      signIn();
      expect(signIn).toHaveBeenCalled();
    });

    it('should throw an error if credentials not provided', () => {
      expect(() => new IracingClient('', '')).toThrow(
        'Iracing Api: Unable to initialze client. Missing email or password'
      );
    });
  });

  describe('Core Methods', () => {
    let client: IracingClient;
    let getResource: jest.SpyInstance;
    const mockResouceGet = async (filePath: string) => {
      await getResource.mockResolvedValue(require(filePath));
    };
    beforeAll(() => {
      client = new IracingClient('test', 'test', { shouldUseInterval: false });
    });

    beforeEach(async () => {
      getResource = jest.spyOn(client, <any>'getResource');

      mockNockHelper()
        .get(/[^\/]+$/)
        .replyWithFile(StatusCodes.OK, mockReplyPath + 'signed-url.json');
    });

    it('should retrieve car data', async () => {
      const mockFile = mockReplyPath + 'car-data.json';
      mockNockHelper()
        .get('/data/car/get')
        .replyWithFile(StatusCodes.OK, mockFile);
      await mockResouceGet(mockFile);
      const carData = await client.getCarData();

      expect(carData[0].car_name).toBe('Skip Barber Formula 2000');
    });

    it('should retrieve car assets', async () => {
      const mockFile = mockReplyPath + 'car-assets.json';
      mockNockHelper()
        .get('/data/car/assets')
        .replyWithFile(StatusCodes.OK, mockFile);

      await mockResouceGet(mockFile);
      const carAssets = await client.getCarAssets();
      expect(carAssets['1'].car_id).toBe(1);
    });

    it('should retrieve track data', async () => {
      const mockFile = mockReplyPath + 'track-data.json';
      mockNockHelper()
        .get('/data/track/get')
        .replyWithFile(StatusCodes.OK, mockFile);
      await mockResouceGet(mockFile);

      const trackData = await client.getTrackData();
      expect(trackData.length).toBeGreaterThan(0);
      expect(trackData[0].track_id).toBe(1);
    });

    it('should retrieve track assets', async () => {
      const mockFile = mockReplyPath + 'track-assets.json';
      mockNockHelper()
        .get('/data/track/assets')
        .replyWithFile(StatusCodes.OK, mockFile);
      await mockResouceGet(mockFile);

      const trackData = await client.getTrackAssets();

      expect(trackData['1'].folder).toBeDefined();
      expect(trackData['1'].track_map_layers.turns).toBe('turns.svg');
    });

    it('should retrieve session results', async () => {
      const mockFile = mockReplyPath + 'session-results.json';
      mockNockHelper()
        .get(/data\/results\/get?\/d+/)
        .replyWithFile(StatusCodes.OK, mockFile);

      await mockResouceGet(mockFile);
      const sessionResults = await client.getSessionResults(12345);

      expect(sessionResults.series_id).toBe(444);
    });

    it('should retrieve event logs', async () => {
      const mockFile = mockReplyPath + 'event-log.json';
      mockNockHelper()
        .get(/data\/results\/event_log\/[^\/]+$/)
        .query({ subsession_id: 1234, simsession_number: 12344 })
        .replyWithFile(StatusCodes.OK, mockFile);

      await mockResouceGet(mockFile);
      const sessionLogs = await client.getSessionLogs(12344, 123445);
      expect(sessionLogs.success).toBe(true);
      expect(sessionLogs.chunk_info.chunk_size).toBe(500);
    });

    it('should get lap chart data', async () => {
      const mockFile = mockReplyPath + 'lap-chart.json';

      mockNockHelper()
        .get(/data\/results\/lap_chart\/[^\/]+$/)
        .query({ subsession_id: 1234, simsession_number: 123445 })
        .replyWithFile(StatusCodes.OK, mockFile);

      await mockResouceGet(mockFile);

      const lapChartData = await client.getLapChartData(123, 123);

      expect(lapChartData.success).toBe(true);
      expect(lapChartData.chunk_info.chunk_size).toBe(500);
    });
  });
});
