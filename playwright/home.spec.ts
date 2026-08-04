import { test, expect, type Page } from '@playwright/test';

const password = 'Password123!';

function randomEmail() {
  return `test+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function registerAndLogin(page: Page, email: string, password: string) {
  await page.goto('/register');
  await page.locator('input[type="email"]').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.locator('button:has-text("Create account")').click();
  await expect(page).toHaveURL('/login');

  await page.locator('input[type="email"]').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.locator('button:has-text("Login")').click();
  await expect(page).toHaveURL('/home');
}

async function authHeaders(page: Page): Promise<Record<string, string>> {
  const accessToken = await page.evaluate(() =>
    sessionStorage.getItem('accessToken'),
  );
  expect(accessToken).toBeTruthy();
  return { Authorization: `Bearer ${accessToken}` };
}

test.describe('Home page flows', () => {
  test('should open a draft without persisting an abandoned CV', async ({
    page,
  }) => {
    const email = randomEmail();

    await registerAndLogin(page, email, password);
    await expect(
      page.getByRole('heading', { name: 'Create a new CV' }),
    ).toBeVisible();

    await page.locator('button:has-text("New CV")').click();
    await expect(
      page.getByRole('heading', { name: 'Choose a template' }),
    ).toBeVisible();
    await page
      .locator('button.template-option', { hasText: 'Single column' })
      .click();
    await expect(page).toHaveURL(/\/cv\/[^/]+\/edit\?.*draft=1/);

    const userId = await page.evaluate(() =>
      sessionStorage.getItem('currentUserId'),
    );
    expect(userId).toBeTruthy();
    await page.getByRole('link', { name: 'Home' }).click();

    const response = await page.request.get('/api/users/me/cvs', {
      headers: await authHeaders(page),
    });
    expect(response.ok()).toBeTruthy();
    expect(await response.json()).toEqual([]);
  });

  test('should prefill a new CV from the saved profile', async ({ page }) => {
    const email = randomEmail();

    await registerAndLogin(page, email, password);
    await page.getByRole('button', { name: 'Open profile settings' }).click();
    await page.getByLabel('First name').fill('Olena');
    await page.getByLabel('Last name').fill('Koval');
    await page.getByLabel('Location').fill('Kyiv, Ukraine');
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByText('Profile saved')).toBeVisible();

    await page.getByRole('button', { name: 'New CV' }).click();
    await page
      .locator('button.template-option', { hasText: 'Single column' })
      .click();
    await expect(page).toHaveURL(/\/cv\/[^/]+\/edit\?.*draft=1/);

    await expect(page.getByLabel('Full name')).toHaveValue('Olena Koval');
    await expect(page.getByLabel('City')).toHaveValue('Kyiv, Ukraine');
  });

  test('should warn before leaving an editor with unsaved changes', async ({
    page,
  }) => {
    const email = randomEmail();

    await registerAndLogin(page, email, password);
    await page.getByRole('button', { name: 'New CV' }).click();
    await page
      .locator('button.template-option', { hasText: 'Single column' })
      .click();

    await page.getByLabel('Full name').fill('Unsaved candidate');
    await page.getByRole('link', { name: 'Home' }).click();

    let dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', {
        name: 'Discard unsaved changes?',
      }),
    ).toBeVisible();
    await expect(dialog).toContainText('all unsaved data will be lost');
    await dialog.getByRole('button', { name: 'Stay' }).click();
    await expect(page).toHaveURL(/\/cv\/[^/]+\/edit\?.*draft=1/);
    await expect(page.getByLabel('Full name')).toHaveValue('Unsaved candidate');

    await page.getByRole('link', { name: 'Home' }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Leave editor' }).click();
    await expect(page).toHaveURL('/home');

    const userId = await page.evaluate(() =>
      sessionStorage.getItem('currentUserId'),
    );
    const response = await page.request.get('/api/users/me/cvs', {
      headers: await authHeaders(page),
    });
    expect(response.ok()).toBeTruthy();
    expect(await response.json()).toEqual([]);
  });

  test('should save incomplete sections as a private draft', async ({
    page,
  }) => {
    const email = randomEmail();

    await registerAndLogin(page, email, password);
    await page.getByRole('button', { name: 'New CV' }).click();
    await page
      .locator('button.template-option', { hasText: 'Single column' })
      .click();

    await page.getByRole('button', { name: /Experience/ }).click();
    await page.getByRole('button', { name: 'Add experience' }).click();
    await page.getByRole('button', { name: /Education/ }).click();
    await page.getByRole('button', { name: 'Add education' }).click();

    const saveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/api\/users\/me\/cvs\/[^/]+$/.test(response.url()),
    );
    await page.getByRole('button', { name: 'Save' }).click();
    expect((await saveResponsePromise).ok()).toBeTruthy();
    await expect(page.getByText('Draft saved')).toBeVisible();

    const userId = await page.evaluate(() =>
      sessionStorage.getItem('currentUserId'),
    );
    const draftCvId = page.url().match(/\/cv\/([^/]+)\/edit$/)?.[1];
    expect(userId).toBeTruthy();
    expect(draftCvId).toBeTruthy();

    const savedDraft = await page.request.get(
      `/api/users/me/cvs/${draftCvId}`,
      { headers: await authHeaders(page) },
    );
    expect(savedDraft.ok()).toBeTruthy();
    expect(await savedDraft.json()).toMatchObject({
      isPublished: false,
      experience: [{ startDate: '', current: false }],
      education: [{ year: '' }],
    });

    const publicDraft = await page.request.get(`/api/cvs/${draftCvId}`);
    expect(publicDraft.status()).toBe(404);

    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.locator('.save-toast')).toContainText(
      'Full name is required',
    );
  });

  test('should only accept experience dates from the date picker', async ({
    page,
  }) => {
    const email = randomEmail();

    await registerAndLogin(page, email, password);
    await page.getByRole('button', { name: 'New CV' }).click();
    await page
      .locator('button.template-option', { hasText: 'Single column' })
      .click();

    await page.getByRole('button', { name: /Experience/ }).click();
    await page.getByRole('button', { name: 'Add experience' }).click();

    const startDate = page.getByLabel('Start date');
    const endDate = page.getByLabel('End date');
    await expect(startDate).toHaveAttribute('readonly', 'true');
    await expect(endDate).toHaveAttribute('readonly', 'true');

    await startDate.focus();
    await page.keyboard.type('2/23/1994abc');
    await expect(startDate).toHaveValue('');

    await startDate.click();
    await expect(page.locator('mat-datepicker-content')).toBeVisible();
  });

  test('should add skills on blur and permanently hide deleted skill options', async ({
    page,
  }) => {
    const email = randomEmail();

    await registerAndLogin(page, email, password);
    await page.getByRole('button', { name: 'New CV' }).click();
    await page
      .locator('button.template-option', { hasText: 'Single column' })
      .click();

    await page.getByRole('button', { name: /Experience/ }).click();
    await page.getByRole('button', { name: 'Add experience' }).click();

    await expect(
      page.getByText(
        'Type or choose a skill. It is added automatically when you leave the field.',
      ),
    ).toBeVisible();
    await expect(page.getByText('Skill appearance')).toBeVisible();
    await expect(
      page.getByText(
        'Show skills as simple text labels or compact visual icons.',
      ),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add skill' })).toHaveCount(
      0,
    );

    const skillInput = page.getByLabel('Find or add skill');
    await skillInput.fill('Observability');
    await page.getByLabel('Company').focus();
    await expect(
      page.getByRole('button', { name: 'Remove Observability' }),
    ).toBeVisible();
    await expect(skillInput).toHaveValue('');

    await page.getByRole('radio', { name: 'Icons' }).click();
    await expect(page.getByText('Customize skill icon')).toBeVisible();
    await expect(
      page.getByText(
        'Generate an icon with AI or upload your own image for the skill entered above.',
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Generate AI icon' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Upload image' }),
    ).toBeVisible();

    await skillInput.fill('AWS');
    const deleteResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        /\/api\/users\/me\/skills$/.test(response.url()),
    );
    await page
      .getByRole('button', { name: 'Delete AWS from skill list' })
      .click();
    expect((await deleteResponsePromise).ok()).toBeTruthy();
    await expect(skillInput).toHaveValue('');

    await skillInput.fill('AWS');
    await expect(
      page.locator('mat-option').filter({ hasText: /^AWS$/ }),
    ).toHaveCount(0);

    const userId = await page.evaluate(() =>
      sessionStorage.getItem('currentUserId'),
    );
    const skillsResponse = await page.request.get('/api/users/me/skills', {
      headers: await authHeaders(page),
    });
    expect(skillsResponse.ok()).toBeTruthy();
    expect(await skillsResponse.json()).toContainEqual(
      expect.objectContaining({ name: 'AWS', hidden: true }),
    );
  });

  test('should optimize an uploaded skill image and save the CV', async ({
    page,
  }) => {
    const email = randomEmail();

    await registerAndLogin(page, email, password);
    await page.getByRole('button', { name: 'New CV' }).click();
    await page
      .locator('button.template-option', { hasText: 'Single column' })
      .click();

    await page.getByLabel('Full name').fill('Skill Image CV');
    await page.getByLabel('Job title').fill('Engineer');
    await page.getByLabel('Email').fill('skill-image@example.com');
    await page.getByLabel('Phone').fill('+380501234567');
    await page.getByLabel('City').fill('Kyiv');
    await page.getByLabel('Summary').fill('A CV with an uploaded skill icon.');
    await expect(page.locator('app-cv-preview')).toContainText(
      'A CV with an uploaded skill icon.',
    );

    await page.getByRole('button', { name: /Experience/ }).click();
    await page.getByRole('button', { name: 'Add experience' }).click();
    await page.getByLabel('Company').fill('Example Company');
    await page.getByLabel('Position').fill('Frontend Engineer');
    const startDate = page.getByLabel('Start date');
    await startDate.evaluate((element) => element.removeAttribute('readonly'));
    await startDate.fill('2/9/1994');
    await page.getByLabel('Current').check();
    await page
      .getByLabel('Description')
      .fill('Built and maintained accessible web applications.');

    await page.getByRole('radio', { name: 'Icons' }).click();
    const skillInput = page.getByLabel('Find or add skill');
    await skillInput.fill('Plain skill');
    await page.getByLabel('Company').focus();
    await expect(
      page.getByRole('button', { name: 'Remove Plain skill' }),
    ).toBeVisible();

    await skillInput.fill('Large SVG skill');
    const largeSvg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">',
      '<rect width="128" height="128" rx="20" fill="#2563eb"/>',
      `<desc>${'large-upload'.repeat(15000)}</desc>`,
      '</svg>',
    ].join('');
    await page.locator('.skill-image-field input[type="file"]').setInputFiles({
      name: 'large-icon.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from(largeSvg),
    });
    await expect(page.getByText('Image optimized and ready.')).toBeVisible();
    await page.getByLabel('Company').focus();
    await expect(
      page.getByRole('button', { name: 'Remove Large SVG skill' }),
    ).toBeVisible();
    await expect(page.locator('app-cv-preview')).toContainText(
      'Built and maintained accessible web applications.',
    );

    const saveUrl = /\/api\/users\/me\/cvs\/[^/]+$/;
    await page.route(saveUrl, async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 400,
          message: 'Experience 1 skill icon is invalid',
        }),
      });
    });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('.save-toast')).toContainText(
      'Experience 1 skill icon is invalid',
    );
    await expect(page.locator('.editor-validation-alert')).toContainText(
      'Experience 1 skill icon is invalid',
    );
    await expect(
      page.locator('.section-item.invalid', { hasText: 'Experience' }),
    ).toBeVisible();
    await page.unroute(saveUrl);

    const requestPromise = page.waitForRequest(
      (request) =>
        request.method() === 'POST' &&
        /\/api\/users\/me\/cvs\/[^/]+$/.test(request.url()),
    );
    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/api\/users\/me\/cvs\/[^/]+$/.test(response.url()),
    );
    await page.getByRole('button', { name: 'Save' }).click();

    const saveRequest = await requestPromise;
    const requestData = saveRequest.postDataJSON() as {
      experience: Array<{
        skills: Array<{ name: string; icon: string | null }>;
      }>;
    };
    const uploadedIcon = requestData.experience[0].skills.find(
      (skill) => skill.name === 'Large SVG skill',
    )?.icon;
    const plainIcon = requestData.experience[0].skills.find(
      (skill) => skill.name === 'Plain skill',
    )?.icon;
    expect(plainIcon).toBeNull();
    expect(uploadedIcon).toMatch(/^data:image\/webp;base64,/);
    expect(uploadedIcon?.length).toBeLessThan(100_000);

    const saveResponse = await responsePromise;
    expect(saveResponse.ok(), await saveResponse.text()).toBeTruthy();
    await expect(page.getByText('Draft saved')).toBeVisible();
  });

  test('should reset validation state after reopening a saved CV', async ({
    page,
  }) => {
    const email = randomEmail();

    await registerAndLogin(page, email, password);
    await page.getByRole('button', { name: 'New CV' }).click();
    await page
      .locator('button.template-option', { hasText: 'Single column' })
      .click();

    await page.getByLabel('Full name').fill('Validation reset CV');
    const jobTitle = page.getByLabel('Job title');
    await jobTitle.fill('Engineer');
    await page.getByLabel('Email').fill('validation@example.com');
    await page.getByLabel('Phone').fill('+380501234567');
    await page.getByLabel('City').fill('Kyiv');
    await page.getByLabel('Summary').fill('Valid summary');

    await expect(page.locator('app-cv-preview')).toContainText('Valid summary');
    const saveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/api\/users\/me\/cvs\/[^/]+$/.test(response.url()),
    );
    await page.getByRole('button', { name: 'Save' }).click();
    expect((await saveResponsePromise).ok()).toBeTruthy();
    await expect(page.getByText('Draft saved')).toBeVisible();
    await expect(page).toHaveURL(/\/cv\/[^/]+\/edit$/);

    await jobTitle.clear();
    await expect(page.locator('app-cv-preview')).not.toContainText('Engineer');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('.save-toast')).toContainText('Draft saved');
    const draftCvId = page.url().match(/\/cv\/([^/]+)\/edit$/)?.[1];
    expect(draftCvId).toBeTruthy();
    const publicDraftResponse = await page.request.get(`/api/cvs/${draftCvId}`);
    expect(publicDraftResponse.status()).toBe(404);

    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.locator('.save-toast')).toContainText(
      'Job title is required',
    );
    await expect(page.locator('.editor-validation-alert')).toContainText(
      'Job title is required',
    );
    await expect(jobTitle).toHaveClass(/ng-touched/);

    await page.getByRole('link', { name: 'Home' }).click();
    const cvCard = page
      .locator('section.cv-section')
      .first()
      .locator('mat-card', { hasText: 'Validation reset CV' });
    await cvCard.getByRole('link', { name: 'Edit' }).click();

    const reopenedJobTitle = page.getByLabel('Job title');
    await expect(reopenedJobTitle).toHaveValue('');
    await expect(reopenedJobTitle).toHaveClass(/ng-untouched/);
  });

  test('should delete a saved CV only after confirmation', async ({ page }) => {
    const email = randomEmail();

    await registerAndLogin(page, email, password);
    await page.getByRole('button', { name: 'New CV' }).click();
    await page
      .locator('button.template-option', { hasText: 'Single column' })
      .click();

    await page.getByLabel('Full name').fill('CV to delete');
    await page.getByLabel('Job title').fill('Designer');
    const emailField = page.getByLabel('Email');
    await emailField.fill('delete@example.com');
    await expect(
      emailField.locator('xpath=ancestor::app-form-text-field'),
    ).toContainText('18 of 120');
    const phoneField = page.getByLabel('Phone');
    await phoneField.fill('501234567');
    await expect(
      page.locator('app-phone-field .iti__selected-dial-code'),
    ).toHaveText('+380');
    await expect(phoneField).toHaveValue('50 123 4567');
    await expect(
      phoneField.locator('xpath=ancestor::app-phone-field'),
    ).not.toContainText('of 16');
    await page.getByLabel('City').fill('Kyiv');
    const summary = page.getByLabel('Summary');
    await summary.fill('a'.repeat(501));
    await expect(summary).toHaveValue('a'.repeat(500));
    const summaryShell = summary.locator(
      'xpath=ancestor::app-form-textarea-field',
    );
    await expect(summaryShell).toContainText('500 of 500');
    const shellBox = await summaryShell.boundingBox();
    const counterBox = await summaryShell
      .locator('.character-counter')
      .boundingBox();
    if (!shellBox || !counterBox) {
      throw new Error('Summary counter is not visible');
    }
    expect(counterBox.y - shellBox.y).toBeLessThan(20);
    expect(shellBox.x + shellBox.width - counterBox.x).toBeLessThan(100);
    await summary.fill('A CV created for the delete flow.');
    await expect(summaryShell).toContainText('33 of 500');
    await expect(page.locator('app-cv-preview')).toContainText(
      'A CV created for the delete flow.',
    );
    const saveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/api\/users\/me\/cvs\/[^/]+$/.test(response.url()),
    );
    await page.getByRole('button', { name: 'Save' }).click();
    const saveResponse = await saveResponsePromise;
    expect(saveResponse.ok(), await saveResponse.text()).toBeTruthy();
    await expect(page).toHaveURL(/\/cv\/[^/]+\/edit$/);

    await page.getByRole('button', { name: 'Delete CV' }).click();
    let dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Delete CV?' }),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(/\/cv\/[^/]+\/edit$/);

    const userId = await page.evaluate(() =>
      sessionStorage.getItem('currentUserId'),
    );
    expect(userId).toBeTruthy();
    let response = await page.request.get('/api/users/me/cvs', {
      headers: await authHeaders(page),
    });
    expect(await response.json()).toHaveLength(1);

    await page.getByRole('link', { name: 'Home' }).click();
    const myCvSection = page.locator('section.cv-section').first();
    const cvCard = myCvSection.locator('mat-card', { hasText: 'CV to delete' });
    await expect(cvCard).toBeVisible();
    await cvCard.getByRole('button', { name: 'Delete' }).click();

    dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('This action cannot be undone.');
    await dialog.getByRole('button', { name: 'Delete' }).click();

    await expect(cvCard).toHaveCount(0);
    response = await page.request.get('/api/users/me/cvs', {
      headers: await authHeaders(page),
    });
    expect(response.ok()).toBeTruthy();
    expect(await response.json()).toEqual([]);
  });

  test('should logout from home and return to login page', async ({ page }) => {
    const email = randomEmail();

    await registerAndLogin(page, email, password);
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL('/login');
    await expect(
      page.locator('mat-card-title', { hasText: 'Login' }),
    ).toBeVisible();
  });
});
