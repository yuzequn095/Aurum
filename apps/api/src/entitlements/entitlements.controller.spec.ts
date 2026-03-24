import { EntitlementsController } from './entitlements.controller';

describe('EntitlementsController', () => {
  it('returns the current user effective AI entitlements', async () => {
    const service = {
      getCurrentUserEntitlements: jest.fn().mockResolvedValue({
        status: 'active',
        planKey: 'premium',
        featureKeys: ['ai.quick_chat'],
        enabledFeatureKeys: ['ai.quick_chat'],
        historicalArtifactReadAllowed: true,
      }),
    };

    const controller = new EntitlementsController(service as never);
    const result = await controller.getMine({
      userId: 'user_1',
      email: 'demo@aurum.local',
    });

    expect(service.getCurrentUserEntitlements).toHaveBeenCalledWith('user_1');
    expect(result).toEqual({
      status: 'active',
      planKey: 'premium',
      featureKeys: ['ai.quick_chat'],
      enabledFeatureKeys: ['ai.quick_chat'],
      historicalArtifactReadAllowed: true,
    });
  });
});
