import { getCurrentHub } from '@sentry/node';
import { Integration } from '@sentry/types';
import {
  app,
  powerMonitor,
  screen,
  // tslint:disable-next-line:no-implicit-dependencies
} from 'electron';

/** Electron integration that cleans up the event. */
export class Electron implements Integration {
  /**
   * @inheritDoc
   */
  public name: string = 'Electron';

  /**
   * @inheritDoc
   */
  public install(): void {
    this.instrumentBreadcrumbs('app', app);

    app.once('ready', () => {
      // We can't access these until 'ready'
      this.instrumentBreadcrumbs('Screen', screen);
      this.instrumentBreadcrumbs('PowerMonitor', powerMonitor);
    });

    app.on('web-contents-created', (_, contents) => {
      // SetImmediate is required for contents.id to be correct
      // https://github.com/electron/electron/issues/12036
      setImmediate(() => {
        this.instrumentBreadcrumbs(`WebContents[${contents.id}]`, contents, ['dom-ready', 'load-url', 'destroyed']);
      });
    });
  }

  /**
   * Hooks into the Electron EventEmitter to capture breadcrumbs for the
   * specified events.
   */
  private instrumentBreadcrumbs(category: string, emitter: Electron.EventEmitter, events: string[] = []): void {
    type Emit = (event: string, ...args: any[]) => boolean;
    const emit = emitter.emit.bind(emitter) as Emit;

    emitter.emit = (event, ...args) => {
      if (events.length === 0 || events.indexOf(event) > -1) {
        const breadcrumb = {
          category: 'electron',
          message: `${category}.${event}`,
          timestamp: new Date().getTime() / 1000,
          type: 'ui',
        };

        getCurrentHub().addBreadcrumb(breadcrumb);
      }

      return emit(event, ...args);
    };
  }
}
