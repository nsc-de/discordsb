import readline from "readline";

export class Question {
  private irs?: (value: Question | PromiseLike<Question>) => void;
  public iprom = new Promise<Question>((resolve) => {
    this.irs = resolve;
  });

  private _resolve?: (value: string | PromiseLike<string>) => void;
  private _reject?: (reason?: any) => void;
  public promise = new Promise<string>((resolve, reject) => {
    this._resolve = resolve;
    this._reject = reject;

    const close = this.ri.openTmp(this);

    this.ri.rl!.question(this.question, (answer) => {
      this._answer = answer;
      this.resolve(answer);
    });
  });

  private _answer?: string;
  public get answer(): string | undefined {
    return this._answer;
  }

  private _finished: boolean = false;
  public get finished(): boolean {
    return this._finished;
  }

  constructor(
    public readonly question: string,
    public readonly ri: ReadlineInterface
  ) {}

  private finish(): boolean {
    if (this.finished) return false;
    this._finished = true;
    this.irs!(this);
    return true;
  }

  private reject(err: any) {
    if (this.finish()) this._reject!(err);
  }

  private resolve(aw: string) {
    if (this.finish()) this._resolve!(aw);
  }

  public terminate() {
    this.reject(new Error("Terminated"));
  }
}

export class ReadlineInterface {
  private questions: Question[] = [];

  /**
   * Is the interface opened (and kept open, not dynamically opened)
   */
  private isOpened: boolean = false;

  /**
   * Is the interface opened at the moment (dynamic or static)
   */
  private _opened: boolean = false;

  /**
   * The readline interface
   */
  private _rl?: readline.Interface;

  /**
   * The readline interface
   */
  get rl(): readline.Interface | undefined {
    return this._rl;
  }

  /**
   * Is the interface opened at the moment (dynamic or static)
   */
  public get opened(): boolean {
    return this._opened;
  }

  /**
   * Open the interface
   */
  open() {
    if (this.isOpened) throw new Error("ReadlineInterface is already opened");
    this.isOpened = true;
    if (!this.opened) this.doOpen();
  }

  /**
   * Opens the interface temporarily. Returns a function to close the temp opened interface.
   * If this is used multiple times the interface will stay opened till all are closed
   */
  openTmp(question: Question) {
    this.questions.push(question);
    question.iprom.then(() => {
      this.tryClose();
    });
    if (!this.opened) this.doOpen();
  }

  /**
   * Performs the actual opening of the readline interface
   */
  private doOpen() {
    if (this.opened) throw new Error("ReadlineInterface is already opened");
    this._opened = true;

    this._rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this._rl.on("close", () => {
      this._opened = false;
      this.isOpened = false;
      this._rl = undefined;
    });
  }

  /**
   * Closes the interface
   */
  close() {
    if (!this.isOpened) throw new Error("ReadlineInterface is not opened");
    this.isOpened = false;
    if (this.questions.length == 0) this.doClose();
  }

  /**
   * Closes the interface
   */
  tryClose() {
    this.filterQuestionList();
    if (this.isOpened) return;
    if (this.questions.length == 0 && this.opened) this.doClose();
  }

  /**
   * Performs the actual closing of the readline interface
   */
  private doClose() {
    if (!this.opened) {
      throw new Error("ReadlineInterface is already closed");
    }
    this._rl!.close();
    this._opened = false;
    this._rl = undefined;
  }

  question(question: string): Promise<string> {
    return new Question(question, this).promise;
  }

  filterQuestionList() {
    for (let i = 0; i < this.questions.length; i++)
      if (this.questions[i].finished) this.questions.splice(i--);
  }
}

const rli = new ReadlineInterface();
export default rli;
