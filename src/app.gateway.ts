import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from './prisma.service';

class Player {
  id: string;
  username: string;
}

export class Card {
  id: string;
  img: string;
  title: string;
  description: string;
  rare: number;
  damage?: number;
  shield?: number;
  play: (...any) => any;
}

class BattlePlayer extends Player {
  constructor(
    public hp: number,
    public shield: number,
    public hand: Card[],
  ) {
    super();
  }
  energy: number;
}

class Battle {
  players: BattlePlayer[];
  decks: Card[][];
  throws: Card[][];
}

class Team {
  players: BattlePlayer[];
  deck: Card[];
  throw: Card[];
}

class Lobby {
  constructor(public id: number) {}
  public status: 'pending' | 'ready' | 'battle' = 'pending';
  private players: Player[] = [];
  private turn: number = 0;
  private battle: Battle | null = null;
  startBattle() {
    console.log('Битва началась!');
    if (this.players.length !== 4) return;
    let hand = [
      {
        id: 'attack',
        img: '',
        title: 'Атака',
        description: 'Атакует врага',
        rare: 0,
        damage: 5,
        play: () => {},
      },
      {
        id: 'shield',
        img: '',
        title: 'Щит',
        description: 'Защитить себя',
        rare: 0,
        shield: 10,
        play: () => {},
      },
      {
        id: 'attack',
        img: '',
        title: 'Атака',
        description: 'Атакует врага',
        rare: 0,
        damage: 5,
        play: () => {},
      },
      {
        id: 'shield',
        img: '',
        title: 'Щит',
        description: 'Защитить себя',
        rare: 0,
        shield: 10,
        play: () => {},
      },
    ];
    this.battle = {
      players: [
        {
          ...this.players[0],
          hp: 100,
          shield: 0,
          hand: [...hand],
          energy: 0,
        },
        {
          ...this.players[1],
          hp: 100,
          shield: 0,
          hand: [...hand],
          energy: 0,
        },
        {
          ...this.players[2],
          hp: 100,
          shield: 0,
          hand: [...hand],
          energy: 0,
        },
        {
          ...this.players[3],
          hp: 100,
          shield: 0,
          hand: [...hand],
          energy: 0,
        },
      ],
      decks: [],
      throws: [],
    };
  }

  playCard(cardId, targetId?: number) {
    const player: BattlePlayer = this.battle.players[this.turn];
    const hand = player.hand;
    const cardIndex = hand.findIndex((card) => card.id === cardId);
    if (cardIndex === -1) return;
    this.battle.players[this.turn].hand = removeByIndex(hand, cardIndex);
  }

  setDeck(deck: Card[][]) {
    this.battle.decks = deck;
  }

  dealHand() {}

  switchTurn() {
    this.turn = this.turn === this.players.length - 1 ? 0 : this.turn + 1;
  }

  pushPlayer(player) {
    if (this.includesPlayer(player.id)) return;
    this.players.push(player);
    if (this.players.length === 3) {
      this.status = 'ready';
    }
  }
  getNumbOfPlayers() {
    return this.players.length;
  }
  includesPlayer(uuid: string) {
    return !!this.players.find((player) => player.id === uuid);
  }
  kickPlayer(uuid: string) {
    const playerIndex = this.players.findIndex((player) => player.id === uuid);
    this.players = removeByIndex(this.players, playerIndex);
  }
}

function removeByIndex(array: any[], index: number) {
  const newArray = array.slice(0, index);
  newArray.push(...array.slice(index + 1));
  return newArray;
}

@WebSocketGateway({
  cors: true,
})
export class AppGateway {
  constructor(private prisma: PrismaService) {}
  @WebSocketServer()
  server: Server;

  private playersOnline: { id: string; user: Player }[] = [];
  private numOfPlayersOnline = () => this.playersOnline.length;
  private lobbies: Lobby[] = [];

  @SubscribeMessage('online')
  async handleConnection(
    @ConnectedSocket() socket: Socket,
    @MessageBody() message,
  ) {
    if (!message) return;
    if (!!this.playersOnline.find((player) => player.id === socket.id)) return;
    if (!!this.playersOnline.find((player) => player.user.id === message.id)) {
      const sameUserIndex = this.playersOnline.findIndex(
        (player) => player.user.id === message.id,
      );
      this.playersOnline[sameUserIndex].id = socket.id;
      return;
    }
    const user = await this.prisma.user.findUnique({
      where: { id: message.id },
      select: { id: true, username: true, email: true },
    });
    if (!user) return;
    this.playersOnline.push({ user: user, id: socket.id });
  }

  private getEmptyLobbies = () => {
    return this.lobbies.filter((lobby) => lobby.getNumbOfPlayers() < 4);
  };

  private getUserBySocketId = (id: string) =>
    this.playersOnline.find((player) => player.id === id)?.user ?? null;

  @SubscribeMessage('message')
  handleMessage(@ConnectedSocket() socket: Socket, @MessageBody() message) {
    const user = this.getUserBySocketId(socket.id);
    if (!user) return;
    socket.emit('message', 'HALLO FROM SERVER');
  }

  @SubscribeMessage('start-battle')
  handleStartBattle(@ConnectedSocket() socket: Socket, @MessageBody() message) {
    const lobbyIndex = this.lobbies.findIndex(
      (lobby) => lobby.id === message.id,
    );
    if (lobbyIndex === -1) return;
    this.lobbies[lobbyIndex].startBattle();
    this.renderLobby(message.id);
  }

  @SubscribeMessage('get-all-players-online')
  handleGetAllOnlinePlayer(@ConnectedSocket() socket: Socket) {
    socket.emit('get-all-players-online', this.numOfPlayersOnline());
  }

  private getUsersLobbyIndex(uuid: string) {
    return this.lobbies.findIndex((lobby) => lobby.includesPlayer(uuid));
  }

  @SubscribeMessage('create-lobby')
  handleCreateLobby(@ConnectedSocket() socket: Socket) {
    let id = Math.floor(Math.random() * 99999);
    while (true) {
      const isUnique =
        this.lobbies.findIndex((lobby) => lobby.id === id) === -1
          ? true
          : false;
      if (isUnique) break;
      id = Math.floor(Math.random() * 99999);
    }
    const user = this.getUserBySocketId(socket.id);
    if (!user) {
      socket.emit('lobby-not-created');
      return;
    }
    const lobbyWithPlayer = this.lobbies.findIndex((lobby) =>
      lobby.includesPlayer(user.id),
    );
    if (lobbyWithPlayer !== -1) {
      socket.emit('lobby-created', this.lobbies[lobbyWithPlayer]);
      return;
    }
    const newLobby = new Lobby(id);
    newLobby.pushPlayer(user);
    this.lobbies.push(newLobby);
    socket.join(newLobby.id.toString());
    socket.emit('lobby-created', newLobby);
  }

  private renderLobby(id: number) {
    const lobby = this.lobbies.find((lobby) => lobby.id === id);
    if (!lobby) return;
    this.server.to(lobby.id.toString()).emit('reload-lobby-info', lobby);
  }

  @SubscribeMessage('close-lobby')
  handleCloseLobby(@ConnectedSocket() socket: Socket) {}

  @SubscribeMessage('leave-lobby')
  handleLeaveLobby(@ConnectedSocket() socket: Socket) {
    const user = this.getUserBySocketId(socket.id);
    if (!user) return;
    const lobbyId = this.kickPlayer(user.id);
    this.renderLobby(lobbyId);
    if (!!lobbyId) socket.leave(lobbyId.toString());
  }

  @SubscribeMessage('find-lobby')
  handleFindLobby(@ConnectedSocket() socket: Socket) {
    const emptyLobbies = this.getEmptyLobbies();
    if (emptyLobbies.length === 0) {
      socket.emit('lobby-not-found');
      return;
    }
    const player = this.getUserBySocketId(socket.id);
    if (!player) {
      socket.emit('lobby-not-found');
      return;
    }
    const lobbyWithPlayer = this.getUsersLobbyIndex(player.id);
    if (lobbyWithPlayer !== -1) {
      socket.emit('lobby-found', this.lobbies[lobbyWithPlayer]);
      return;
    }
    const lobbyId = emptyLobbies[0].id;
    const lobbyIndex = this.lobbies.findIndex((lobby) => lobby.id === lobbyId);
    this.lobbies[lobbyIndex].pushPlayer(player);
    const room = this.lobbies[lobbyIndex].id.toString();
    socket.join(room);
    this.renderLobby(this.lobbies[lobbyIndex].id);
    socket.emit('lobby-found', this.lobbies[lobbyIndex]);
  }

  private kickPlayer(uuid: string) {
    const lobbyIndex = this.lobbies.findIndex((lobby) =>
      lobby.includesPlayer(uuid),
    );
    if (lobbyIndex === -1) return;
    const lobbyId = this.lobbies[lobbyIndex].id;
    this.lobbies[lobbyIndex].kickPlayer(uuid);
    this.renderLobby(this.lobbies[lobbyIndex].id);
    if (this.lobbies[lobbyIndex].getNumbOfPlayers() === 0)
      this.lobbies = removeByIndex(this.lobbies, lobbyIndex);
    return lobbyId;
  }

  @SubscribeMessage('disconnect')
  handleDisconnect(@ConnectedSocket() socket: Socket) {
    const userIndex = this.playersOnline.findIndex(
      (player) => player.id === socket.id,
    );
    if (userIndex === -1) return;
    const lobbyId = this.kickPlayer(this.playersOnline[userIndex].user.id);
    if (!!lobbyId) socket.leave(lobbyId.toString());
    this.playersOnline = removeByIndex(this.playersOnline, userIndex);
  }
}
