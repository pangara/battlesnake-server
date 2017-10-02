defmodule Bs.Game do
  alias Bs.Game.PubSub
  alias Bs.Game.Registry
  alias Bs.Game.Server
  alias Bs.World.Factory

  use GenServer

  defmodule Command, do: defstruct [:name, :data]

  @moduledoc """
  The Game is a GenServer that handles running a single Bs match.
  """

  def start_link(args, opts \\ [])

  def start_link(args, opts) do
    GenServer.start_link(__MODULE__, args, opts)
  end

  def get_game_state(pid) do
    GenServer.call(pid, :get_game_state)
  end

  def next(pid) do
    GenServer.call(pid, :next)
  end

  def pause(pid) do
    GenServer.call(pid, :pause)
  end

  def prev(pid) do
    GenServer.call(pid, :prev)
  end

  def resume(pid) do
    GenServer.call(pid, :resume)
  end

  def alive?(id) do
    case Registry.lookup(id) do
      [_] ->
        true

      _ ->
        false
    end
  end

  @doc "Replay the current game."
  def replay(pid) do
    GenServer.call(pid, :replay)
  end

  defdelegate handle_call(request, from, state), to: Server
  defdelegate handle_cast(request, state), to: Server
  defdelegate handle_info(request, state), to: Server
  defdelegate init(args), to: Server

  def find! name do
    case lookup_or_create name do
      {:ok, pid} when is_pid pid ->
        pid

      {:error, {:already_started, pid}} when is_pid pid ->
        pid

      {:error, err} ->
        raise err
    end
  end

  def lookup_or_create(id) when is_binary(id) do
    fun = fn ->
      id = String.to_integer id

      game_form = BsRepo.get! BsRepo.GameForm, id

      delay = game_form.delay

      world =  Factory.build game_form

      singleplayer = fn (world) ->
        length(world.snakes) <= 0
      end

      multiplayer = fn (world) ->
        length(world.snakes) <= 1
      end

      objective = case game_form.game_mode do
        "singleplayer" -> singleplayer
        "multiplayer" -> multiplayer
      end

      %Bs.GameState{
        delay: delay,
        game_form: game_form,
        game_form_id: id,
        objective: objective,
        world: world,
      }
    end

    Registry.lookup_or_create(fun, id)
  end

  defdelegate name(id), to: Registry, as: :via

  defdelegate subscribe(name), to: PubSub
end
