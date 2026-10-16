using System.Collections.Concurrent;
using System.Text.Json;
using HtmlTinkerX;
using Microsoft.Playwright;

// HtmlTinkerX owns installation, browser launch, and session disposal.
if (args is ["--install"]) {
    await HtmlBrowser.EnsureInstalledAsync(HtmlBrowserEngine.Chromium);
    return;
}

if (args.Length != 3 || !Uri.TryCreate(args[0], UriKind.Absolute, out var url)
    || url.Scheme != "http" || url.Host != "127.0.0.1"
    || !int.TryParse(args[1], out var width) || !int.TryParse(args[2], out var height)) {
    throw new ArgumentException("Expected a local fixture URL, viewport width, and viewport height.");
}

await using var session = await HtmlBrowser.OpenSessionAsync("about:blank", headless: true,
    viewportWidth: width, viewportHeight: height, timeout: 30000);
var pageErrors = new ConcurrentQueue<string>();
var consoleErrors = new ConcurrentQueue<string>();
session.Page.PageError += (_, error) => pageErrors.Enqueue(error);
session.Page.Console += (_, message) => {
    if (message.Type == "error") consoleErrors.Enqueue(message.Text);
};

await session.Page.GotoAsync(url.AbsoluteUri, new PageGotoOptions {
    WaitUntil = WaitUntilState.NetworkIdle, Timeout = 30000
});
await session.Page.WaitForFunctionAsync("() => window.__toggleMetrics?.done === true",
    options: new PageWaitForFunctionOptions { Timeout = 30000 });
var metricsJson = await session.Page.EvaluateAsync<string>("() => JSON.stringify(window.__toggleMetrics)");
var metrics = JsonSerializer.Deserialize<JsonElement>(metricsJson);

var screenshotDirectory = Environment.GetEnvironmentVariable("HTMLEXTENSIONS_TEST_SCREENSHOT_DIR");
if (!string.IsNullOrWhiteSpace(screenshotDirectory)) {
    Directory.CreateDirectory(screenshotDirectory);
    await session.Page.ScreenshotAsync(new PageScreenshotOptions {
        Path = Path.Combine(screenshotDirectory, $"toggleView-{width}x{height}.png"), FullPage = true
    });
}

Console.WriteLine("HTMLEXTENSIONS_RESULT:" + JsonSerializer.Serialize(new { metrics, pageErrors, consoleErrors }));
